const { pool } = require("../db/index");

// GET /users/:id/public-profile
// Returns public profile of any user with stats and reviews
const getPublicProfile = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get user base info
    const userResult = await pool.query(
      `SELECT id, name, role, is_verified, is_suspended, strike_count, created_at
       FROM users WHERE id = $1`,
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const user = userResult.rows[0];

    // Get reviews for this user
    const reviewsResult = await pool.query(
      `SELECT r.*, u.name as reviewer_name, u.profile_image_url as reviewer_image
       FROM reviews r
       JOIN users u ON r.reviewer_id = u.id
       WHERE r.reviewed_id = $1
       ORDER BY r.created_at DESC`,
      [id]
    );

    const reviews = reviewsResult.rows;

    // Calculate average rating
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    let stats = {};

    if (user.role === "SELLER") {
      const statsResult = await pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE status IN ('ENDED', 'SOLD')) AS completed_auctions,
           COUNT(*) FILTER (WHERE status = 'ACTIVE') AS active_auctions,
           COUNT(*) AS total_auctions
         FROM auctions WHERE seller_id = $1`,
        [id]
      );
      stats = statsResult.rows[0];
    } else if (user.role === "BUYER") {
      const statsResult = await pool.query(
        `SELECT
           COUNT(*) AS total_bids,
           COUNT(DISTINCT auction_id) AS auctions_participated,
           COUNT(*) FILTER (WHERE status = 'WON') AS auctions_won
         FROM bids WHERE bidder_id = $1`,
        [id]
      );

      // Reliability score: paid orders / won auctions
      const ordersResult = await pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'PAID') AS paid_orders,
           COUNT(*) AS total_orders
         FROM orders WHERE buyer_id = $1`,
        [id]
      );

      const won = parseInt(statsResult.rows[0].auctions_won) || 0;
      const paid = parseInt(ordersResult.rows[0].paid_orders) || 0;
      const reliabilityScore = won > 0 ? Math.round((paid / won) * 100) : 100;

      stats = {
        ...statsResult.rows[0],
        reliability_score: reliabilityScore,
        paid_orders: ordersResult.rows[0].paid_orders,
      };
    }

    return res.json({
      success: true,
      profile: {
        ...user,
        avg_rating: Math.round(avgRating * 10) / 10,
        review_count: reviews.length,
        stats,
        reviews,
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /reviews
// Leave a review after an auction ends
const createReview = async (req, res, next) => {
  try {
    const { auction_id, reviewed_id, rating, comment } = req.body;
    const reviewer_id = req.user.id;

    if (!auction_id || !reviewed_id || !rating) {
      return res.status(400).json({ success: false, message: "auction_id, reviewed_id and rating are required" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
    }

    // Get reviewer role
    const reviewerResult = await pool.query(
      "SELECT role FROM users WHERE id = $1",
      [reviewer_id]
    );
    const reviewer_role = reviewerResult.rows[0]?.role;

    // Verify auction exists and is ended
    const auctionResult = await pool.query(
      "SELECT * FROM auctions WHERE id = $1",
      [auction_id]
    );

    if (auctionResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Auction not found" });
    }

    const auction = auctionResult.rows[0];

    if (!["ENDED", "SOLD"].includes(auction.status)) {
      return res.status(400).json({ success: false, message: "Can only review after auction ends" });
    }

    // Verify reviewer was involved in this auction
    if (reviewer_role === "BUYER") {
      // Buyer must have bid on this auction
      const bidCheck = await pool.query(
        "SELECT id FROM bids WHERE auction_id = $1 AND bidder_id = $2",
        [auction_id, reviewer_id]
      );
      if (bidCheck.rows.length === 0) {
        return res.status(403).json({ success: false, message: "You must have bid on this auction to review" });
      }
      // Buyer reviews seller — verify reviewed_id is the seller
      if (reviewed_id !== auction.seller_id) {
        return res.status(403).json({ success: false, message: "You can only review the seller of this auction" });
      }
    } else if (reviewer_role === "SELLER") {
      // Seller must own this auction
      if (auction.seller_id !== reviewer_id) {
        return res.status(403).json({ success: false, message: "You can only review buyers of your own auctions" });
      }
      // Seller reviews winning buyer
      if (reviewed_id !== auction.highest_bidder_id) {
        return res.status(403).json({ success: false, message: "You can only review the winning bidder" });
      }
    }

    const result = await pool.query(
      `INSERT INTO reviews (reviewer_id, reviewed_id, auction_id, rating, comment, reviewer_role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [reviewer_id, reviewed_id, auction_id, rating, comment, reviewer_role]
    );

    return res.status(201).json({ success: true, review: result.rows[0] });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(400).json({ success: false, message: "You have already reviewed this auction" });
    }
    next(err);
  }
};

// GET /reviews/can-review/:auction_id
// Check if current user can leave a review for this auction
const canReview = async (req, res, next) => {
  try {
    const { auction_id } = req.params;
    const user_id = req.user.id;

    const userResult = await pool.query("SELECT role FROM users WHERE id = $1", [user_id]);
    const role = userResult.rows[0]?.role;

    const auctionResult = await pool.query("SELECT * FROM auctions WHERE id = $1", [auction_id]);
    const auction = auctionResult.rows[0];

    if (!auction || !["ENDED", "SOLD"].includes(auction.status)) {
      return res.json({ success: true, can_review: false, reviewed_id: null });
    }

    // Check already reviewed
    const existing = await pool.query(
      "SELECT id FROM reviews WHERE reviewer_id = $1 AND auction_id = $2",
      [user_id, auction_id]
    );

    if (existing.rows.length > 0) {
      return res.json({ success: true, can_review: false, already_reviewed: true });
    }

    if (role === "BUYER") {
      const bidCheck = await pool.query(
        "SELECT id FROM bids WHERE auction_id = $1 AND bidder_id = $2",
        [auction_id, user_id]
      );
      const can_review = bidCheck.rows.length > 0;
      return res.json({ success: true, can_review, reviewed_id: auction.seller_id });
    }

    if (role === "SELLER" && auction.seller_id === user_id && auction.highest_bidder_id) {
      return res.json({ success: true, can_review: true, reviewed_id: auction.highest_bidder_id });
    }

    return res.json({ success: true, can_review: false });
  } catch (err) {
    next(err);
  }
};

module.exports = { getPublicProfile, createReview, canReview };