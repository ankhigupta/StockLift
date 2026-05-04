const express = require("express");
const router = express.Router();
const {
  createOrderFromAuction,
  getMyOrders,
  getSellerOrders,
  getOrderById,
  promoteOrder,
  markOrderPaid
} = require("../controllers/order.controller");
const { protect } = require("../middleware/auth.middleware");

router.post("/create-from-auction/:auction_id", protect, createOrderFromAuction);
router.get("/my", protect, getMyOrders);
router.get("/seller", protect, getSellerOrders);
router.get("/:id", protect, getOrderById);
router.put("/:id/promote", protect, promoteOrder);
router.put("/:id/mark-paid", protect, markOrderPaid);

module.exports = router;