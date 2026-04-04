const { pool } = require("../db/index");

// POST /payments/create-order
// creating a payment order (will be replaced with Razorpay later)
const createPaymentOrder = async (req, res, next) => {
  try {
    const { order_id } = req.body;
    const user_id = req.user.id;

    if (!order_id) {
      return res.status(400).json({ success: false, message: "order_id is required" });
    }

    // Checking if order exists and belongs to this buyer
    const orderResult = await pool.query(
      "SELECT * FROM orders WHERE id = $1 AND buyer_id = $2",
      [order_id, user_id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const order = orderResult.rows[0];

    if (order.status !== "PENDING") {
      return res.status(400).json({ success: false, message: "Order is not pending" });
    }

    // Checking payment deadline
    if (new Date() > new Date(order.payment_deadline)) {
      return res.status(400).json({ success: false, message: "Payment deadline has passed" });
    }

    // Creating a placeholder payment record
    const result = await pool.query(
      `INSERT INTO payments (order_id, amount, currency, status)
       VALUES ($1, $2, 'INR', 'PENDING')
       RETURNING *`,
      [order_id, order.final_amount]
    );

    res.status(201).json({
      success: true,
      payment: result.rows[0],
      message: "Payment order created. Use /payments/verify to simulate payment.",
    });
  } catch (err) {
    next(err);
  }
};

// POST /payments/verify
// payment verification (will be replaced with Razorpay webhook later)
const verifyPayment = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { payment_id } = req.body;
    const user_id = req.user.id;

    if (!payment_id) {
      return res.status(400).json({ success: false, message: "payment_id is required" });
    }

    await client.query("BEGIN");

    // Getting payment and joining with order
    const paymentResult = await client.query(
      `SELECT p.*, o.buyer_id, o.auction_id
       FROM payments p
       JOIN orders o ON p.order_id = o.id
       WHERE p.id = $1 AND o.buyer_id = $2
       FOR UPDATE`,
      [payment_id, user_id]
    );

    if (paymentResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    const payment = paymentResult.rows[0];

    if (payment.status !== "PENDING") {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, message: "Payment already processed" });
    }

    // Marking payment as PAID
    await client.query(
      `UPDATE payments 
       SET status = 'PAID', updated_at = NOW()
       WHERE id = $1`,
      [payment_id]
    );

    // Marking order as PAID
    await client.query(
      `UPDATE orders 
       SET status = 'PAID', updated_at = NOW()
       WHERE id = $1`,
      [payment.order_id]
    );

    // Marking auction as SOLD
    await client.query(
      `UPDATE auctions 
       SET status = 'SOLD', updated_at = NOW()
       WHERE id = $1`,
      [payment.auction_id]
    );

    await client.query("COMMIT");

    res.json({
      success: true,
      message: "Payment verified successfully",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
};

// GET /payments/order/:order_id - getting payment status for an order
const getPaymentByOrder = async (req, res, next) => {
  try {
    const { order_id } = req.params;
    const user_id = req.user.id;

    const result = await pool.query(
      `SELECT p.*
       FROM payments p
       JOIN orders o ON p.order_id = o.id
       WHERE p.order_id = $1 AND (o.buyer_id = $2 OR o.seller_id = $2)`,
      [order_id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Payment not found" });
    }

    res.json({ success: true, payment: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

module.exports = { createPaymentOrder, verifyPayment, getPaymentByOrder };