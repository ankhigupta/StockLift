const express = require("express");
const router = express.Router();
const { upload, cloudinary } = require("../config/cloudinary");
const { protect } = require("../middleware/auth.middleware");

// POST /upload/images - upload multiple images
router.post("/images", protect, upload.array("images", 5), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "No images uploaded" });
    }

    const imageUrls = req.files.map(file => file.path);

    res.json({
      success: true,
      images: imageUrls,
      message: `${imageUrls.length} image(s) uploaded successfully`,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /upload/image - delete an image
router.delete("/image", protect, async (req, res, next) => {
  try {
    const { imageUrl } = req.body;
    
    // Extract public_id from cloudinary URL
    const publicId = imageUrl.split("/").slice(-2).join("/").split(".")[0];
    
    await cloudinary.uploader.destroy(`stocklift/auctions/${publicId.split("/").pop()}`);
    
    res.json({ success: true, message: "Image deleted" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;