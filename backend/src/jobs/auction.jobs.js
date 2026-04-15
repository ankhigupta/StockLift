const cron = require("node-cron");
const { pool } = require("../db/index");
const { sendNotification, sendMulticastNotification } = require("../config/firebase");

// Runs every minute — checks for auctions that should become ACTIVE
const startScheduledAuctions = async () => {
  try {
    const result = await pool.query(
      `UPDATE auctions 
       SET status = 'ACTIVE', updated_at = NOW()
       WHERE status = 'UPCOMING' 
       AND start_time <= NOW()
       RETURNING id, title`
    );
    if (result.rows.length > 0) {
      console.log(`Started ${result.rows.length} auctions:`, result.rows.map(a => a.title));
    }
  } catch (err) {
    console.error("Error starting auctions:", err.message);
  }
};

// Runs every minute — checks for auctions that should end
const endExpiredAuctions = async () => {
  const client = await pool.connect();
  try {
    // Find auctions that have passed end_time
    const expiredAuctions = await client.query(
      `SELECT * FROM auctions 
       WHERE status = 'ACTIVE' 
       AND end_time <= NOW()`
    );

    for (const auction of expiredAuctions.rows) {
      await client.query("BEGIN");
      try {
        if (!auction.highest_bidder_id) {
          // No bids — mark as EXPIRED
          await client.query(
            "UPDATE auctions SET status = 'EXPIRED', updated_at = NOW() WHERE id = $1",
            [auction.id]
          );
          console.log(`Auction expired (no bids): ${auction.title}`);
        } else {
          // Has bids — create order for winner
          const paymentDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000);

          await client.query(
            `INSERT INTO orders (auction_id, buyer_id, seller_id, final_amount, payment_deadline)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT DO NOTHING`,
            [auction.id, auction.highest_bidder_id, auction.seller_id, auction.current_highest_bid, paymentDeadline]
          );

          await client.query(
            "UPDATE auctions SET status = 'ENDED', updated_at = NOW() WHERE id = $1",
            [auction.id]
          );

          await client.query(
            "UPDATE bids SET status = 'WON' WHERE auction_id = $1 AND bidder_id = $2 AND status = 'LEADING'",
            [auction.id, auction.highest_bidder_id]
          );

          await client.query(
            "UPDATE bids SET status = 'LOST' WHERE auction_id = $1 AND status NOT IN ('WON', 'LOST')",
            [auction.id]
          );

          console.log(`Auction ended, order created: ${auction.title}`);
        }
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`Error ending auction ${auction.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error("Error in endExpiredAuctions:", err.message);
  } finally {
    client.release();
  }
};

// Runs every 5 minutes — promotes orders where payment deadline passed
const promoteUnpaidOrders = async () => {
  const client = await pool.connect();
  try {
    const unpaidOrders = await client.query(
      `SELECT * FROM orders 
       WHERE status = 'PENDING' 
       AND payment_deadline <= NOW()`
    );

    for (const order of unpaidOrders.rows) {
      await client.query("BEGIN");
      try {
        // Find second highest bidder
        const secondBidder = await client.query(
          `SELECT * FROM bids 
           WHERE auction_id = $1 AND bidder_id != $2 AND status = 'OUTBID'
           ORDER BY bid_amount DESC
           LIMIT 1`,
          [order.auction_id, order.buyer_id]
        );

        if (secondBidder.rows.length === 0) {
          // No second bidder
          await client.query(
            "UPDATE orders SET status = 'FAILED', updated_at = NOW() WHERE id = $1",
            [order.id]
          );
          await client.query(
            "UPDATE auctions SET status = 'EXPIRED', updated_at = NOW() WHERE id = $1",
            [order.auction_id]
          );
          console.log(`Order failed, no second bidder: ${order.id}`);
        } else {
          const newBuyer = secondBidder.rows[0];
          const newDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000);

          await client.query(
            "UPDATE orders SET status = 'PROMOTED', updated_at = NOW() WHERE id = $1",
            [order.id]
          );

          await client.query(
            `INSERT INTO orders (auction_id, buyer_id, seller_id, final_amount, payment_deadline)
             VALUES ($1, $2, $3, $4, $5)`,
            [order.auction_id, newBuyer.bidder_id, order.seller_id, newBuyer.bid_amount, newDeadline]
          );

          await client.query(
            "UPDATE bids SET status = 'WON' WHERE id = $1",
            [newBuyer.id]
          );

          console.log(`Order promoted to second bidder: ${order.id}`);
        }
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`Error promoting order ${order.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error("Error in promoteUnpaidOrders:", err.message);
  } finally {
    client.release();
  }
};

// Register all cron jobs
const initCronJobs = () => {
  // Every minute — start scheduled auctions
  cron.schedule("* * * * *", () => {
    startScheduledAuctions();
  });

  // Every minute — end expired auctions
  cron.schedule("* * * * *", () => {
    endExpiredAuctions();
  });

  // Every 5 minutes — promote unpaid orders
  cron.schedule("*/5 * * * *", () => {
    promoteUnpaidOrders();
  });

  console.log("Cron jobs initialized");
};

module.exports = { initCronJobs };