const express = require("express");
const router = express.Router();
const { getPublicProfile, createReview, canReview } = require("../controllers/review.controller");
const { protect } = require("../middleware/auth.middleware");

router.get("/users/:id/public-profile", getPublicProfile);
router.post("/reviews", protect, createReview);
router.get("/reviews/can-review/:auction_id", protect, canReview);

module.exports = router;