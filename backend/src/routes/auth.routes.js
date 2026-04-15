const express = require("express");
const router = express.Router();
const { register, login, me, refresh, logout , saveFcmToken} = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth.middleware");

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, me);
router.post("/refresh", refresh);
router.post("/logout", protect, logout);
router.post("/fcm-token", protect, saveFcmToken);

module.exports = router;