const express = require("express");
const router = express.Router();
const { getProfile, updateProfileImage } = require("../controllers/user.controller");
const { protect } = require("../middleware/auth.middleware");

// reuse the same multer+cloudinary setup as upload.routes.js
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "stocklift/profiles",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 400, height: 400, crop: "fill", gravity: "face" }],
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

router.get("/profile", protect, getProfile);
router.put("/profile/image", protect, upload.single("image"), updateProfileImage);

module.exports = router;