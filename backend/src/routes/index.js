const express = require("express");
const router = express.Router();

const authRoutes = require("./auth.routes");
const auctionRoutes = require("./auction.routes");
const bidRoutes = require("./bid.routes");
const orderRoutes = require("./order.routes");
const paymentRoutes = require("./payment.routes");
const dashboardRoutes = require("./dashboard.routes");
const uploadRoutes = require("./upload.routes");
const userRoutes = require("./user.routes");

router.use("/auth", authRoutes);
router.use("/auctions", auctionRoutes);
router.use("/bids", bidRoutes);
router.use("/orders", orderRoutes);
router.use("/payments", paymentRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/upload", uploadRoutes);
router.use("/users", userRoutes); 

module.exports = router;