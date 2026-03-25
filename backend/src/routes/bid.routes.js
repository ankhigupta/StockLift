const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.json({ message: "Bids routes working" });
});

module.exports = router;