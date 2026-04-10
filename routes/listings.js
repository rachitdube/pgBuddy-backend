import express from "express";
import {
  createListing,
  deleteListing,
  getListing,
  getListings,
  getMyListings,
  updateListing,
} from "../controllers/listingController.js";
import { landlordOnly, protect, studentOnly } from "../middleware/auth.js";
import {
  deletePhoto,
  setPrimaryPhoto,
  uploadPhoto,
} from "../controllers/photoController.js";
import {
  addReview,
  deleteReview,
  getReviews,
} from "../controllers/reviewController.js";
import { upload } from "../config/cloudinary.js";

const router = express.Router();

//public route to get all listings
router.get("/", getListings);
router.get("/my", protect, landlordOnly, getMyListings);
router.get("/:id", getListing);

// Landlord routes
router.post("/", protect, landlordOnly, createListing);
router.put("/:id", protect, landlordOnly, updateListing);
router.delete("/:id", protect, landlordOnly, deleteListing);

// Photo routes
router.post(
  "/:id/photos",
  protect,
  landlordOnly,
  upload.single("photo"),
  uploadPhoto,
);
router.put(
  "/:id/photos/:photoId/primary",
  protect,
  landlordOnly,
  setPrimaryPhoto,
);
router.delete("/:id/photos/:photoId", protect, landlordOnly, deletePhoto);

// Review routes (public read, student write)
router.get("/:id/reviews", getReviews);
router.post("/:id/reviews", protect, studentOnly, addReview);
router.delete("/:id/reviews/:reviewId", protect, deleteReview);

export default router;
