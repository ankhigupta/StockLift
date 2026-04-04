const { pool } = require("../db/index");

// GET /dashboard/seller
const getSellerDashboard = async (req, res, next) => {
  try {
    const seller_id = req.user.id;

    // Total auctions
    const totalAuctions = await pool.query(
      "SELECT COUNT(*) FROM auctions WHERE seller_id = $1",
      [seller_id]
    );

    // Auctions by status
    const auctionsByStatus = await pool.query(
      `SELECT status, COUNT(*) as count 
       FROM auctions 
       WHERE seller_id = $1 
       GROUP BY status`,
      [seller_id]
    );

    // Total revenue (from PAID orders)
    const revenue = await pool.query(
      `SELECT COALESCE(SUM(final_amount), 0) as total_revenue
       FROM orders 
       WHERE seller_id = $1 AND status = 'PAID'`,
      [seller_id]
    );

    // Recent auctions
    const recentAuctions = await pool.query(
      `SELECT id, title, status, current_highest_bid, end_time
       FROM auctions
       WHERE seller_id = $1
       ORDER BY created_at DESC
       LIMIT 5`,
      [seller_id]
    );

    // Pending orders (buyers who haven't paid yet)
    const pendingOrders = await pool.query(
      `SELECT COUNT(*) FROM orders 
       WHERE seller_id = $1 AND status = 'PENDING'`,
      [seller_id]
    );

    res.json({
      success: true,
      dashboard: {
        total_auctions: parseInt(totalAuctions.rows[0].count),
        auctions_by_status: auctionsByStatus.rows,
        total_revenue: parseFloat(revenue.rows[0].total_revenue),
        pending_orders: parseInt(pendingOrders.rows[0].count),
        recent_auctions: recentAuctions.rows,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /dashboard/buyer
const getBuyerDashboard = async (req, res, next) => {
  try {
    const buyer_id = req.user.id;

    // Total bids placed
    const totalBids = await pool.query(
      "SELECT COUNT(*) FROM bids WHERE bidder_id = $1",
      [buyer_id]
    );

    // Auctions won
    const auctionsWon = await pool.query(
      `SELECT COUNT(*) FROM orders 
       WHERE buyer_id = $1 AND status = 'PAID'`,
      [buyer_id]
    );

    // Total amount spent
    const totalSpent = await pool.query(
      `SELECT COALESCE(SUM(final_amount), 0) as total_spent
       FROM orders 
       WHERE buyer_id = $1 AND status = 'PAID'`,
      [buyer_id]
    );

    // Pending orders
    const pendingOrders = await pool.query(
      `SELECT o.*, a.title as auction_title
       FROM orders o
       JOIN auctions a ON o.auction_id = a.id
       WHERE o.buyer_id = $1 AND o.status = 'PENDING'
       ORDER BY o.payment_deadline ASC`,
      [buyer_id]
    );

    // Active bids (auctions still running)
    const activeBids = await pool.query(
      `SELECT b.*, a.title as auction_title, a.current_highest_bid, a.end_time
       FROM bids b
       JOIN auctions a ON b.auction_id = a.id
       WHERE b.bidder_id = $1 AND a.status = 'ACTIVE'
       ORDER BY b.created_at DESC`,
      [buyer_id]
    );

    res.json({
      success: true,
      dashboard: {
        total_bids: parseInt(totalBids.rows[0].count),
        auctions_won: parseInt(auctionsWon.rows[0].count),
        total_spent: parseFloat(totalSpent.rows[0].total_spent),
        pending_orders: pendingOrders.rows,
        active_bids: activeBids.rows,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getSellerDashboard, getBuyerDashboard };