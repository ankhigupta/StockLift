const { pool } = require("../db/index");
const cloudinary = require("../config/cloudinary");

// GET /users/profile
const getProfile = async (req, res) => {
  const userId = req.user.id;

  try {
    // Get base user info
    const userResult = await pool.query(
      `SELECT id, name, email, role, phone, profile_image_url, created_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = userResult.rows[0];
    let stats = {};

    if (user.role === "SELLER") {
      const statsResult = await pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'ACTIVE')   AS active_auctions,
           COUNT(*) FILTER (WHERE status = 'ENDED')    AS ended_auctions,
           COUNT(*) FILTER (WHERE status = 'SOLD')     AS sold_auctions,
           COUNT(*)                                     AS total_auctions,
           COALESCE(SUM(current_highest_bid) FILTER (WHERE status = 'SOLD'), 0) AS total_revenue
         FROM auctions WHERE seller_id = $1`,
        [userId]
      );
      stats = statsResult.rows[0];
    } else if (user.role === "BUYER") {
      const statsResult = await pool.query(
        `SELECT
           COUNT(*)                          AS total_bids,
           COUNT(DISTINCT auction_id)        AS auctions_participated,
           COUNT(*) FILTER (WHERE status = 'WON') AS auctions_won
         FROM bids WHERE bidder_id = $1`,
        [userId]
      );
      stats = statsResult.rows[0];
    }

    return res.json({ user, stats });
  } catch (err) {
    console.error("getProfile error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// PUT /users/profile/image
const updateProfileImage = async (req, res) => {
  const userId = req.user.id;

  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image provided" });
    }

    // req.file.path is the Cloudinary URL (multer-storage-cloudinary)
    const imageUrl = req.file.path;

    await pool.query(
      `UPDATE users SET profile_image_url = $1, updated_at = NOW() WHERE id = $2`,
      [imageUrl, userId]
    );

    return res.json({ message: "Profile image updated", profile_image_url: imageUrl });
  } catch (err) {
    console.error("updateProfileImage error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getProfile, updateProfileImage };