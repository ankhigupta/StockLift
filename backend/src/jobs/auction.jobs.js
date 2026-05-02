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
       RETURNING id, title, seller_id`
    );

    for (const auction of result.rows) {
      // Notify seller that auction went live
      const sellerResult = await pool.query(
        "SELECT fcm_token FROM users WHERE id = $1",
        [auction.seller_id]
      );
      const sellerToken = sellerResult.rows[0]?.fcm_token;
      if (sellerToken) {
        sendNotification(
          sellerToken,
          "Your Auction is Now Live! 🚀",
          `"${auction.title}" has started. Buyers can now place bids!`,
          { type: "auction_started", auction_id: auction.id }
        ).catch(err => console.error("FCM error:", err.message));
      }
    }

    if (result.rows.length > 0) {
      console.log(`Started ${result.rows.length} auctions:`, result.rows.map(a => a.title));
    }
  } catch (err) {
    console.error("Error starting auctions:", err.message);
  }
};

// Runs every minute — checks for auctions ending in 30 minutes
const notifyAuctionsEndingSoon = async () => {
  try {
    // Find auctions ending in 25-35 mins (to avoid duplicate notifications)
    const auctions = await pool.query(
      `SELECT a.id, a.title, a.end_time
       FROM auctions a
       WHERE a.status = 'ACTIVE'
       AND a.end_time BETWEEN NOW() + INTERVAL '25 minutes' AND NOW() + INTERVAL '35 minutes'`
    );

    for (const auction of auctions.rows) {
      // Get all unique bidders for this auction
      const biddersResult = await pool.query(
        `SELECT DISTINCT u.fcm_token 
         FROM bids b
         JOIN users u ON b.bidder_id = u.id
         WHERE b.auction_id = $1 AND u.fcm_token IS NOT NULL`,
        [auction.id]
      );

      const tokens = biddersResult.rows.map(r => r.fcm_token).filter(Boolean);
      if (tokens.length > 0) {
        sendMulticastNotification(
          tokens,
          "⏰ Auction Ending Soon!",
          `"${auction.title}" ends in 30 minutes. Place your final bid now!`,
          { type: "auction_ending_soon", auction_id: auction.id }
        ).catch(err => console.error("FCM error:", err.message));
      }
    }
  } catch (err) {
    console.error("Error in notifyAuctionsEndingSoon:", err.message);
  }
};

// Runs every minute — checks for auctions that should end
const endExpiredAuctions = async () => {
  const client = await pool.connect();
  try {
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

          // Notify seller
          const sellerResult = await pool.query(
            "SELECT fcm_token FROM users WHERE id = $1",
            [auction.seller_id]
          );
          const sellerToken = sellerResult.rows[0]?.fcm_token;
          if (sellerToken) {
            sendNotification(
              sellerToken,
              "Auction Ended — No Bids",
              `"${auction.title}" ended without any bids. Consider relisting it.`,
              { type: "auction_expired", auction_id: auction.id }
            ).catch(err => console.error("FCM error:", err.message));
          }

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

          // Keep second highest bid as OUTBID for potential promotion
          await client.query(
            `UPDATE bids SET status = 'OUTBID' 
             WHERE auction_id = $1 
             AND bidder_id != $2
             AND bid_amount = (
               SELECT MAX(bid_amount) FROM bids 
               WHERE auction_id = $1 AND bidder_id != $2
             )`,
            [auction.id, auction.highest_bidder_id]
          );

          // Mark all other bids as LOST
          await client.query(
            `UPDATE bids SET status = 'LOST' 
             WHERE auction_id = $1 
             AND status NOT IN ('WON', 'LOST', 'OUTBID')`,
            [auction.id]
          );

          // Get winner and seller details for notifications
          const [winnerResult, sellerResult] = await Promise.all([
            pool.query("SELECT name, fcm_token FROM users WHERE id = $1", [auction.highest_bidder_id]),
            pool.query("SELECT name, fcm_token FROM users WHERE id = $1", [auction.seller_id]),
          ]);

          const winner = winnerResult.rows[0];
          const seller = sellerResult.rows[0];

          // Notify winner
          if (winner?.fcm_token) {
            sendNotification(
              winner.fcm_token,
              "🎉 You Won the Auction!",
              `Congratulations! You won "${auction.title}" for ₹${Number(auction.current_highest_bid).toLocaleString("en-IN")}. Please complete payment within 24 hours.`,
              { type: "auction_won", auction_id: auction.id }
            ).catch(err => console.error("FCM error:", err.message));
          }

          // Notify seller of successful auction
          if (seller?.fcm_token) {
            sendNotification(
              seller.fcm_token,
              "Auction Sold! 💰",
              `"${auction.title}" was won by ${winner?.name || "a buyer"} for ₹${Number(auction.current_highest_bid).toLocaleString("en-IN")}. Payment expected within 24 hours.`,
              { type: "auction_sold", auction_id: auction.id }
            ).catch(err => console.error("FCM error:", err.message));
          }

          // Notify losing bidders
          const loserTokens = await pool.query(
            `SELECT DISTINCT u.fcm_token 
             FROM bids b
             JOIN users u ON b.bidder_id = u.id
             WHERE b.auction_id = $1 
             AND b.bidder_id != $2
             AND u.fcm_token IS NOT NULL`,
            [auction.id, auction.highest_bidder_id]
          );

          const tokens = loserTokens.rows.map(r => r.fcm_token).filter(Boolean);
          if (tokens.length > 0) {
            sendMulticastNotification(
              tokens,
              "Auction Ended",
              `"${auction.title}" has ended. You didn't win this time, but more auctions are live now!`,
              { type: "auction_lost", auction_id: auction.id }
            ).catch(err => console.error("FCM error:", err.message));
          }

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
        // Add strike to buyer who didn't pay
        await client.query(
          `INSERT INTO strikes (buyer_id, auction_id, reason)
           VALUES ($1, $2, 'Payment not completed within 24 hours')`,
          [order.buyer_id, order.auction_id]
        );

        // Increment strike count, suspend if 4+
        await client.query(
          `UPDATE users 
           SET strike_count = strike_count + 1,
               is_suspended = CASE WHEN strike_count + 1 >= 4 THEN TRUE ELSE is_suspended END,
               updated_at = NOW()
           WHERE id = $1`,
          [order.buyer_id]
        );

        // Get updated strike count and buyer FCM token
        const buyerResult = await pool.query(
          "SELECT name, fcm_token, strike_count FROM users WHERE id = $1",
          [order.buyer_id]
        );
        const buyer = buyerResult.rows[0];

        // Notify buyer of strike
        if (buyer?.fcm_token) {
          const newStrikeCount = buyer.strike_count;
          const isSuspended = newStrikeCount >= 4;

          sendNotification(
            buyer.fcm_token,
            isSuspended ? "⛔ Account Suspended" : `⚠️ Strike ${newStrikeCount}/4 Added`,
            isSuspended
              ? "Your account has been suspended due to repeated non-payment. Contact support."
              : `You received a strike for not paying. ${4 - newStrikeCount} more strike(s) will result in suspension.`,
            { type: "strike_added", strike_count: String(newStrikeCount) }
          ).catch(err => console.error("FCM error:", err.message));
        }

        console.log(`Strike added to buyer: ${order.buyer_id}`);

        // Find second highest bidder
        const secondBidder = await client.query(
          `SELECT * FROM bids 
           WHERE auction_id = $1 AND bidder_id != $2 AND status = 'OUTBID'
           ORDER BY bid_amount DESC
           LIMIT 1`,
          [order.auction_id, order.buyer_id]
        );

        if (secondBidder.rows.length === 0) {
          await client.query(
            "UPDATE orders SET status = 'FAILED', updated_at = NOW() WHERE id = $1",
            [order.id]
          );
          await client.query(
            "UPDATE auctions SET status = 'EXPIRED', updated_at = NOW() WHERE id = $1",
            [order.auction_id]
          );

          // Notify seller order failed
          const sellerResult = await pool.query(
            "SELECT fcm_token FROM users WHERE id = $1",
            [order.seller_id]
          );
          const sellerToken = sellerResult.rows[0]?.fcm_token;
          if (sellerToken) {
            sendNotification(
              sellerToken,
              "Order Failed — No Second Bidder",
              "The winning buyer didn't pay and there's no second bidder. Consider relisting your item.",
              { type: "order_failed", auction_id: order.auction_id }
            ).catch(err => console.error("FCM error:", err.message));
          }

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

          // Notify second bidder they won
          const secondBuyerResult = await pool.query(
            "SELECT name, fcm_token FROM users WHERE id = $1",
            [newBuyer.bidder_id]
          );
          const secondBuyerToken = secondBuyerResult.rows[0]?.fcm_token;

          if (secondBuyerToken) {
            sendNotification(
              secondBuyerToken,
              "🎉 You Won the Auction!",
              `The original winner didn't pay — congratulations, you've won! Please complete payment within 24 hours.`,
              { type: "auction_won_promoted", auction_id: order.auction_id }
            ).catch(err => console.error("FCM error:", err.message));
          }

          // Notify seller
          const sellerResult = await pool.query(
            "SELECT fcm_token FROM users WHERE id = $1",
            [order.seller_id]
          );
          const sellerToken = sellerResult.rows[0]?.fcm_token;
          if (sellerToken) {
            sendNotification(
              sellerToken,
              "Order Transferred to Second Bidder",
              `The original winner didn't pay. Your item has been offered to the next highest bidder.`,
              { type: "order_promoted", auction_id: order.auction_id }
            ).catch(err => console.error("FCM error:", err.message));
          }

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

  // Every minute — notify auctions ending soon
  cron.schedule("* * * * *", () => {
    notifyAuctionsEndingSoon();
  });

  // Every 5 minutes — promote unpaid orders
  cron.schedule("*/5 * * * *", () => {
    promoteUnpaidOrders();
  });

  console.log("Cron jobs initialized");
};

module.exports = { initCronJobs };