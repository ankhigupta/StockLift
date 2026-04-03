const express = require("express");
const router = express.Router();

const {
  createAuction,
  getAuctions,
  getAuctionById,
  updateAuction,
  deleteAuction,
} = require("../controllers/auction.controller");
const { protect } = require("../middleware/auth.middleware");

router.get("/", getAuctions);                          // public
router.get("/:id", getAuctionById);                    // public
router.post("/", protect, createAuction);              // seller only
router.put("/:id", protect, updateAuction);            // seller only
router.delete("/:id", protect, deleteAuction);         // seller only

module.exports = router;