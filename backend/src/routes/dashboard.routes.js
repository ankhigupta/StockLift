const express = require("express");
const router = express.Router();

const { getSellerDashboard, getBuyerDashboard } = require("../controllers/dashboard.controller");
const { protect } = require("../middleware/auth.middleware");

router.get("/seller", protect, getSellerDashboard);
router.get("/buyer", protect, getBuyerDashboard);

module.exports = router;