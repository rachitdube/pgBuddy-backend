import { cloudinary } from "../config/cloudinary.js";
import { sql } from "../db/db.js";

// POST /api/listings/:id/photos — upload photo to Cloudinary + save URL
export const uploadPhoto = async (req, res) => {
  try {
    const { id } = req.params;

    // Check listing ownership
    const [listing] = await sql`
      SELECT landlord_id FROM listings WHERE id = ${id}
    `;

    if (!listing) return res.status(404).json({ error: "Listing not found." });
    if (listing.landlord_id !== req.user.id) {
      return res
        .status(403)
        .json({ error: "You can only upload photos to your own listings." });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    //uploadig to cloudinary via a buffer
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: "pg_buddy",
            transformation: [
              { width: 1200, height: 800, crop: "limit", quality: "auto" },
            ],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          },
        )
        .end(req.file.buffer);
    });

    // Check if this should be primary (first photo = primary)
    const [existingPhoto] = await sql`
      SELECT id FROM photos WHERE listing_id = ${id} LIMIT 1
    `;
    const is_primary = !existingPhoto;

    const [photo] = await sql`
      INSERT INTO photos (listing_id, url, is_primary)
      VALUES (${id}, ${result.secure_url}, ${is_primary})
      RETURNING *
    `;

    res.status(201).json({ message: "Photo uploaded.", photo });
  } catch (error) {
    console.error("uploadPhoto error:", error);
    res.status(500).json({ error: "Failed to upload photo." });
  }
};

// PUT /api/listings/:id/photos/:photoId/primary — set as primary photo
export const setPrimaryPhoto = async (req, res) => {
  try {
    const { id, photoId } = req.params;

    const [listing] = await sql`
      SELECT landlord_id FROM listings WHERE id = ${id}
    `;

    if (!listing) return res.status(404).json({ error: "Listing not found." });
    if (listing.landlord_id !== req.user.id) {
      return res.status(403).json({ error: "Access denied." });
    }

    // Unset all primary photos for this listing
    await sql`
      UPDATE photos SET is_primary = false WHERE listing_id = ${id}
    `;

    // Set new primary
    await sql`
      UPDATE photos SET is_primary = true
      WHERE id = ${photoId} AND listing_id = ${id}
    `;

    res.json({ message: "Primary photo updated." });
  } catch (error) {
    console.error("setPrimaryPhoto error:", error);
    res.status(500).json({ error: "Failed to update primary photo." });
  }
};

// DELETE /api/listings/:id/photos/:photoId
export const deletePhoto = async (req, res) => {
  try {
    const { id, photoId } = req.params;

    const [listing] = await sql`
      SELECT landlord_id FROM listings WHERE id = ${id}
    `;

    if (!listing) return res.status(404).json({ error: "Listing not found." });
    if (listing.landlord_id !== req.user.id) {
      return res.status(403).json({ error: "Access denied." });
    }

    await sql`
      DELETE FROM photos WHERE id = ${photoId} AND listing_id = ${id}
    `;

    res.json({ message: "Photo deleted." });
  } catch (error) {
    console.error("deletePhoto error:", error);
    res.status(500).json({ error: "Failed to delete photo." });
  }
};
