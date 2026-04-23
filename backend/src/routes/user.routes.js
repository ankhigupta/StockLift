const express = require("express");
const router = express.Router();
const { getProfile, updateProfileImage } = require("../controllers/user.controller");
const { protect } = require("../middleware/auth.middleware");
const { cloudinary } = require("../config/cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

const profileStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "stocklift/profiles",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 400, height: 400, crop: "fill", gravity: "face" }],
  },
});

const profileUpload = multer({
  storage: profileStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.get("/profile", protect, getProfile);
router.put("/profile/image", protect, profileUpload.single("image"), updateProfileImage);

module.exports = router;