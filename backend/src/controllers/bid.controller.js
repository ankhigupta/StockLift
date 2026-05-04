const { pool } = require("../db/index");
//const { getIO } = require("../socket/socket");
//const { sendNotification } = require("../config/firebase");


// POST /bids - placing a bid
const placeBid = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { auction_id, bid_amount } = req.body;
    const bidder_id = req.user.id;
 
    // Check suspension
    const suspendedCheck = await pool.query(
      "SELECT is_suspended FROM users WHERE id = $1",
      [bidder_id]
    );
    if (suspendedCheck.rows[0]?.is_suspended) {
      return res.status(403).json({
        success: false,
        message: "Your account has been suspended due to repeated non-payment. Please contact support.",
      });
    }
 
    if (!auction_id || !bid_amount) {
      return res.status(400).json({ success: false, message: "auction_id and bid_amount are required" });
    }
 
    await client.query("BEGIN");
 
    // Lock auction row to prevent race conditions
    const auctionResult = await client.query(
      "SELECT * FROM auctions WHERE id = $1 FOR UPDATE",
      [auction_id]
    );
 
    if (auctionResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Auction not found" });
    }
 
    const auction = auctionResult.rows[0];
 
    if (auction.status !== "ACTIVE") {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, message: "Auction is not active" });
    }
 
    if (auction.seller_id === bidder_id) {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, message: "Seller cannot bid on own auction" });
    }
 
    const minimumBid = parseFloat(auction.current_highest_bid) > 0
      ? parseFloat(auction.current_highest_bid) + parseFloat(auction.min_bid_increment || 100)
      : parseFloat(auction.base_price);
 
    if (parseFloat(bid_amount) < minimumBid) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: `Minimum bid is ₹${minimumBid}. Current highest: ₹${auction.current_highest_bid || 0}, Base price: ₹${auction.base_price}`,
      });
    }
 
    // Store outbid user info before updating
    let outbidUser = null;
    if (auction.highest_bidder_id) {
      const outbidResult = await pool.query(
        "SELECT id, name, fcm_token FROM users WHERE id = $1",
        [auction.highest_bidder_id]
      );
      outbidUser = outbidResult.rows[0];
 
      await client.query(
        `UPDATE bids SET status = 'OUTBID' 
         WHERE auction_id = $1 AND bidder_id = $2 AND status = 'LEADING'`,
        [auction_id, auction.highest_bidder_id]
      );
    }
 
    // Insert new bid
    const bidResult = await client.query(
      `INSERT INTO bids (auction_id, bidder_id, bid_amount, status)
       VALUES ($1, $2, $3, 'LEADING')
       RETURNING *`,
      [auction_id, bidder_id, bid_amount]
    );
 
    // Update auction with new highest bid
    await client.query(
      `UPDATE auctions 
       SET current_highest_bid = $1, highest_bidder_id = $2, updated_at = NOW()
       WHERE id = $3`,
      [bid_amount, bidder_id, auction_id]
    );
 
    // Auto-extend if bid placed in last 60 mins
    const endTime = new Date(auction.end_time);
    const now = new Date();
    const minutesLeft = (endTime - now) / (1000 * 60);
 
    if (minutesLeft <= 60) {
      const newEndTime = new Date(endTime.getTime() + 60 * 60 * 1000);
      await client.query(
        "UPDATE auctions SET end_time = $1 WHERE id = $2",
        [newEndTime, auction_id]
      );
    }
 
    await client.query("COMMIT");
 
    const bidderResult = await pool.query(
    "SELECT name FROM users WHERE id = $1", [bidder_id]
  );
  const bidderName = bidderResult.rows[0]?.name || "Someone";
 
    // Socket.IO real-time events
    try {
      const { getIO } = require("../socket/socket");
      const io = getIO();
 
      const newBid = {
        ...bidResult.rows[0],
        created_at: new Date(bidResult.rows[0].created_at).toISOString(),
      };
 
      io.to(`auction:${auction_id}`).emit("bid:new", {
        auction_id,
        bid: newBid,
        current_highest_bid: bid_amount,
        bidder_name: bidderName,
      });
 
      if (minutesLeft <= 60) {
        const updatedAuction = await pool.query(
          "SELECT end_time FROM auctions WHERE id = $1",
          [auction_id]
        );
        io.to(`auction:${auction_id}`).emit("auction:extended", {
          auction_id,
          new_end_time: updatedAuction.rows[0].end_time,
        });
      }
    } catch (err) {
      console.error("Socket emission error:", err.message);
    }
 
    const responseBid = {
      ...bidResult.rows[0],
      created_at: new Date(bidResult.rows[0].created_at).toISOString(),
    };
 
    res.status(201).json({ success: true, bid: responseBid });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
};
 
// GET /bids/auction/:auction_id
const getBidsByAuction = async (req, res, next) => {
  try {
    const { auction_id } = req.params;
 
    const result = await pool.query(
      `SELECT b.*, u.name as bidder_name, u.profile_image_url as bidder_profile_image
       FROM bids b
       JOIN users u ON b.bidder_id = u.id
       WHERE b.auction_id = $1
       ORDER BY b.bid_amount DESC`,
      [auction_id]
    );
 
    const formattedBids = result.rows.map(bid => ({
      ...bid,
      created_at: new Date(bid.created_at).toISOString(),
    }));
 
    res.json({ success: true, bids: formattedBids });
  } catch (err) {
    next(err);
  }
};
 
// GET /bids/my
const getMyBids = async (req, res, next) => {
  try {
    const bidder_id = req.user.id;
 
    const result = await pool.query(
      `SELECT b.*, a.title as auction_title, a.end_time, a.status as auction_status
       FROM bids b
       JOIN auctions a ON b.auction_id = a.id
       WHERE b.bidder_id = $1
       ORDER BY b.created_at DESC`,
      [bidder_id]
    );
 
    const formattedBids = result.rows.map(bid => ({
      ...bid,
      created_at: new Date(bid.created_at).toISOString(),
    }));
 
    res.json({ success: true, bids: formattedBids });
  } catch (err) {
    next(err);
  }
};
 
module.exports = { placeBid, getBidsByAuction, getMyBids };