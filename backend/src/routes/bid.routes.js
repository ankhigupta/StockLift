const express = require("express");
const router = express.Router();

const { placeBid, getBidsByAuction, getMyBids } = require("../controllers/bid.controller");
const { protect } = require("../middleware/auth.middleware");

router.post("/", protect, placeBid);                           // buyer places bid
router.get("/auction/:auction_id", getBidsByAuction);          // get bids for auction (public)
router.get("/my", protect, getMyBids);                         // get my bids (protected)

module.exports = router;