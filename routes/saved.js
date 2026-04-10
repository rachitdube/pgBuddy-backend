import express from "express";
import {
  getSaved,
  saveListing,
  unsaveListing,
} from "../controllers/savedController.js";
import { protect, studentOnly } from "../middleware/auth.js";

const router = express.Router();

router.get("/", protect, studentOnly, getSaved);
router.post("/:listingId", protect, studentOnly, saveListing);
router.delete("/:listingId", protect, studentOnly, unsaveListing);

export default router;
