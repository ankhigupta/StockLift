const express = require("express");
const router = express.Router();

const {
  createPaymentOrder,
  verifyPayment,
  getPaymentByOrder,
} = require("../controllers/payment.controller");
const { protect } = require("../middleware/auth.middleware");

router.post("/create-order", protect, createPaymentOrder);
router.post("/verify", protect, verifyPayment);
router.get("/order/:order_id", protect, getPaymentByOrder);

module.exports = router;