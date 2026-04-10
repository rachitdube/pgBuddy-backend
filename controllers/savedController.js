import { sql } from "../db/db.js";

// GET /api/saved — get student's saved listings
export const getSaved = async (req, res) => {
  try {
    const saved = await sql`
      SELECT l.id, l.title, l.city, l.rent_min, l.rent_max,
             l.type, l.gender, l.available_rooms,
             MIN(p.url) FILTER (WHERE p.is_primary = true) AS primary_photo,
             s.saved_at
      FROM saved_listings s
      JOIN listings l ON l.id = s.listing_id
      LEFT JOIN photos p ON p.listing_id = l.id
      WHERE s.user_id = ${req.user.id} AND l.is_active = true
      GROUP BY l.id, s.saved_at
      ORDER BY s.saved_at DESC
    `;

    res.json({ saved });
  } catch (error) {
    console.error("getSaved error:", error);
    res.status(500).json({ error: "Failed to fetch saved listings." });
  }
};

// POST /api/saved/:listingId — save a listing
export const saveListing = async (req, res) => {
  try {
    const { listingId } = req.params;

    await sql`
      INSERT INTO saved_listings (user_id, listing_id)
      VALUES (${req.user.id}, ${listingId})
      ON CONFLICT (user_id, listing_id) DO NOTHING
    `;

    res.status(201).json({ message: "Listing saved." });
  } catch (error) {
    console.error("saveListing error:", error);
    res.status(500).json({ error: "Failed to save listing." });
  }
};

// DELETE /api/saved/:listingId — unsave a listing
export const unsaveListing = async (req, res) => {
  try {
    const { listingId } = req.params;

    await sql`
      DELETE FROM saved_listings
      WHERE user_id = ${req.user.id} AND listing_id = ${listingId}
    `;

    res.json({ message: "Listing removed from saved." });
  } catch (error) {
    console.error("unsaveListing error:", error);
    res.status(500).json({ error: "Failed to unsave listing." });
  }
};
