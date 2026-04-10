import { sql } from "../db/db.js";

// GET /api/listings/:id/reviews
export const getReviews = async (req, res) => {
  try {
    const { id } = req.params;

    const reviews = await sql`
      SELECT r.id, r.rating, r.comment, r.created_at,
             u.name AS reviewer_name
      FROM reviews r
      JOIN users u ON u.id = r.student_id
      WHERE r.listing_id = ${id}
      ORDER BY r.created_at DESC
    `;

    res.json({ reviews });
  } catch (error) {
    console.error("getReviews error:", error);
    res.status(500).json({ error: "Failed to fetch reviews." });
  }
};

// POST /api/listings/:id/reviews
export const addReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    if (!rating) {
      return res.status(400).json({ error: "Rating is required." });
    }

    // Can't review your own listing
    const [listing] = await sql`
      SELECT landlord_id FROM listings WHERE id = ${id}
    `;

    if (!listing) return res.status(404).json({ error: "Listing not found." });
    if (listing.landlord_id === req.user.id) {
      return res
        .status(403)
        .json({ error: "You cannot review your own listing." });
    }

    const [review] = await sql`
      INSERT INTO reviews (listing_id, student_id, rating, comment)
      VALUES (${id}, ${req.user.id}, ${rating}, ${comment ?? null})
      RETURNING *
    `;

    res.status(201).json({ message: "Review added.", review });
  } catch (error) {
    if (error.message?.includes("unique")) {
      return res
        .status(409)
        .json({ error: "You have already reviewed this listing." });
    }
    console.error("addReview error:", error);
    res.status(500).json({ error: "Failed to add review." });
  }
};

// DELETE /api/listings/:id/reviews/:reviewId
export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const [review] = await sql`
      SELECT student_id FROM reviews WHERE id = ${reviewId}
    `;

    if (!review) return res.status(404).json({ error: "Review not found." });
    if (review.student_id !== req.user.id) {
      return res
        .status(403)
        .json({ error: "You can only delete your own reviews." });
    }

    await sql`DELETE FROM reviews WHERE id = ${reviewId}`;

    res.json({ message: "Review deleted." });
  } catch (error) {
    console.error("deleteReview error:", error);
    res.status(500).json({ error: "Failed to delete review." });
  }
};
