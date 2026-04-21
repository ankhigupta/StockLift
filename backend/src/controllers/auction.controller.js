const { pool } = require("../db/index");

// POST /auctions - seller creates auction
const createAuction = async (req, res, next) => {
  try {
    const { 
      title, description, category, base_price, 
      start_time, end_time, images, quantity, 
      location, condition, min_bid_increment 
    } = req.body;
    const seller_id = req.user.id;

    if (!title || !base_price || !start_time || !end_time) {
      return res.status(400).json({ 
        success: false, 
        message: "title, base_price, start_time and end_time are required" 
      });
    }

    const result = await pool.query(
      `INSERT INTO auctions (
        title, description, category, base_price, seller_id, 
        start_time, end_time, images, quantity, location, 
        condition, min_bid_increment
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::text[], $9, $10, $11, $12)
      RETURNING *`,
      [
        title, description, category, base_price, seller_id,
        start_time, end_time, images || [], quantity || 1,
        location, condition || 'NEW', min_bid_increment || 100
      ]
    );

    res.status(201).json({ success: true, auction: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// GET /auctions - list all active auctions
const getAuctions = async (req, res, next) => {
  try {
    const { status = "ACTIVE", category, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT a.*, u.name as seller_name 
      FROM auctions a
      JOIN users u ON a.seller_id = u.id
      WHERE a.status = $1
    `;
    const params = [status];

    if (category) {
      query += ` AND a.category = $${params.length + 1}`;
      params.push(category);
    }

    query += ` ORDER BY a.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    const countResult = await pool.query(
      "SELECT COUNT(*) FROM auctions WHERE status = $1",
      [status]
    );

    res.json({
      success: true,
      auctions: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    next(err);
  }
};

// GET /auctions/:id - get single auction
const getAuctionById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT a.*, u.name as seller_name
       FROM auctions a
       JOIN users u ON a.seller_id = u.id
       WHERE a.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Auction not found" });
    }

    res.json({ success: true, auction: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// PUT /auctions/:id - seller updates auction
const updateAuction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, category, base_price, start_time, end_time } = req.body;
    const seller_id = req.user.id;

    const existing = await pool.query(
      "SELECT * FROM auctions WHERE id = $1 AND seller_id = $2",
      [id, seller_id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Auction not found or unauthorized" });
    }

    if (existing.rows[0].status !== "UPCOMING") {
      return res.status(400).json({ success: false, message: "Can only edit UPCOMING auctions" });
    }

    const result = await pool.query(
      `UPDATE auctions 
       SET title = $1, description = $2, category = $3, base_price = $4, 
           start_time = $5, end_time = $6, updated_at = NOW()
       WHERE id = $7 AND seller_id = $8
       RETURNING *`,
      [title, description, category, base_price, start_time, end_time, id, seller_id]
    );

    res.json({ success: true, auction: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// DELETE /auctions/:id - seller deletes auction
const deleteAuction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const seller_id = req.user.id;

    const existing = await pool.query(
      "SELECT * FROM auctions WHERE id = $1 AND seller_id = $2",
      [id, seller_id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Auction not found or unauthorized" });
    }

    if (existing.rows[0].status !== "UPCOMING") {
      return res.status(400).json({ success: false, message: "Can only delete UPCOMING auctions" });
    }

    await pool.query("DELETE FROM auctions WHERE id = $1", [id]);

    res.json({ success: true, message: "Auction deleted successfully" });
  } catch (err) {
    next(err);
  }
};

module.exports = { createAuction, getAuctions, getAuctionById, updateAuction, deleteAuction };