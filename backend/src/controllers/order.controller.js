const { pool } = require("../db/index");

// POST /orders/create-from-auction/:auction_id
// Called when auction ends, creates order for winner
const createOrderFromAuction = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { auction_id } = req.params;

    await client.query("BEGIN");

    // Lock auction row
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

    if (!auction.highest_bidder_id) {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, message: "No bids placed on this auction" });
    }

    // Setting payment deadline to 24 hours from now
    const paymentDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Creating order for winner
    const orderResult = await client.query(
      `INSERT INTO orders (auction_id, buyer_id, seller_id, final_amount, payment_deadline)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        auction_id,
        auction.highest_bidder_id,
        auction.seller_id,
        auction.current_highest_bid,
        paymentDeadline,
      ]
    );

    // Marking auction as ENDED
    await client.query(
      "UPDATE auctions SET status = 'ENDED', updated_at = NOW() WHERE id = $1",
      [auction_id]
    );

    // Marking winning bid as WON
    await client.query(
      `UPDATE bids SET status = 'WON' 
       WHERE auction_id = $1 AND bidder_id = $2 AND status = 'LEADING'`,
      [auction_id, auction.highest_bidder_id]
    );

    // Marking all other bids as LOST
    await client.query(
      `UPDATE bids SET status = 'LOST'
       WHERE auction_id = $1 AND status NOT IN ('WON', 'LOST')`,
      [auction_id]
    );

    await client.query("COMMIT");

    res.status(201).json({ success: true, order: orderResult.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
};

// GET /orders/my - buyer can see their orders
const getMyOrders = async (req, res, next) => {
  try {
    const buyer_id = req.user.id;

    const result = await pool.query(
      `SELECT o.*, a.title as auction_title, a.category,
              u.name as seller_name
       FROM orders o
       JOIN auctions a ON o.auction_id = a.id
       JOIN users u ON o.seller_id = u.id
       WHERE o.buyer_id = $1
       ORDER BY o.created_at DESC`,
      [buyer_id]
    );

    res.json({ success: true, orders: result.rows });
  } catch (err) {
    next(err);
  }
};

// GET /orders/seller - seller sees orders for their auctions
const getSellerOrders = async (req, res, next) => {
  try {
    const seller_id = req.user.id;

    const result = await pool.query(
      `SELECT o.*, a.title as auction_title, a.category,
              u.name as buyer_name
       FROM orders o
       JOIN auctions a ON o.auction_id = a.id
       JOIN users u ON o.buyer_id = u.id
       WHERE o.seller_id = $1
       ORDER BY o.created_at DESC`,
      [seller_id]
    );

    res.json({ success: true, orders: result.rows });
  } catch (err) {
    next(err);
  }
};

// GET /orders/:id - getting single order
const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    const result = await pool.query(
      `SELECT o.*, a.title as auction_title, a.category,
              u.name as seller_name, b.name as buyer_name
       FROM orders o
       JOIN auctions a ON o.auction_id = a.id
       JOIN users u ON o.seller_id = u.id
       JOIN users b ON o.buyer_id = b.id
       WHERE o.id = $1 AND (o.buyer_id = $2 OR o.seller_id = $2)`,
      [id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    res.json({ success: true, order: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// PUT /orders/:id/promote - promoting to second highest bidder
const promoteOrder = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    await client.query("BEGIN");

    // Getting the order
    const orderResult = await client.query(
      "SELECT * FROM orders WHERE id = $1 FOR UPDATE",
      [id]
    );

    if (orderResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const order = orderResult.rows[0];

    if (order.status !== "PENDING") {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, message: "Order is not pending" });
    }

    // Checking if payment deadline has passed
    if (new Date() < new Date(order.payment_deadline)) {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, message: "Payment deadline has not passed yet" });
    }

    // Finding the second highest bidder
    const secondBidder = await client.query(
      `SELECT * FROM bids 
       WHERE auction_id = $1 AND bidder_id != $2 AND status = 'OUTBID'
       ORDER BY bid_amount DESC
       LIMIT 1`,
      [order.auction_id, order.buyer_id]
    );

    if (secondBidder.rows.length === 0) {
      // No second bidder - marking auction as EXPIRED
      await client.query(
        "UPDATE auctions SET status = 'EXPIRED' WHERE id = $1",
        [order.auction_id]
      );
      await client.query(
        "UPDATE orders SET status = 'FAILED', updated_at = NOW() WHERE id = $1",
        [id]
      );
      await client.query("COMMIT");
      return res.json({ success: true, message: "No second bidder found. Auction marked as EXPIRED." });
    }

    const newBuyer = secondBidder.rows[0];
    const newPaymentDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Marking old order as PROMOTED
    await client.query(
      "UPDATE orders SET status = 'PROMOTED', updated_at = NOW() WHERE id = $1",
      [id]
    );

    // Creating new order for second bidder
    const newOrderResult = await client.query(
      `INSERT INTO orders (auction_id, buyer_id, seller_id, final_amount, payment_deadline)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [order.auction_id, newBuyer.bidder_id, order.seller_id, newBuyer.bid_amount, newPaymentDeadline]
    );

    // Updating bid statuses
    await client.query(
      //new change
      `UPDATE bids SET status = 'LOST' WHERE id = $1,
      WHERE auction_id=$1 AND bidder_id=$2 AND status="WON"`
      [order.auction_id,order.buyer_id]
    );
    await client.query(
      "UPDATE bids SET status = 'WON' WHERE id = $1",
      [newBuyer.id]
    );

    await client.query("COMMIT");

    res.json({ success: true, order: newOrderResult.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
};

module.exports = {
  createOrderFromAuction,
  getMyOrders,
  getSellerOrders,
  getOrderById,
  promoteOrder,
};