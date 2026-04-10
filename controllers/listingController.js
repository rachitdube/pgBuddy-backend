import { sql } from "../db/db.js";

// search listings with filters
export const getListings = async (req, res) => {
  try {
    const { city, gender, type, rent_max, rent_min } = req.query;

    const listings = await sql`
            SELECT l.id, l.title, l.address, l.city, l.pincode, l.rent_min, l.rent_max, l.lat, l.lng, l.created_at,
            COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0) AS avg_rating,
            COUNT(DISTINCT r.id) AS review_count,
            MIN(p.url) FILTER (WHERE p.is_primary = true) AS primary_photo
            FROM listings l
            LEFT JOIN reviews r ON r.listing_id = l.id
            LEFT JOIN photos p ON p.listing_id = l.id
            WHERE l.is_active = true
            AND (${city ?? null}::text IS NULL OR l.city ILIKE ${"%" + (city ?? "") + "%"})
            AND (${gender ?? null}::text IS NULL OR l.gender = ${gender ?? null}::text)
            AND (${type ?? null}::text IS NULL OR l.type = ${type ?? null}::text)
            AND (${rent_min ?? null}::integer IS NULL OR l.rent_min >= ${rent_min ? Number(rent_min) : null}::integer)
            AND (${rent_max ?? null}::integer IS NULL OR l.rent_max <= ${rent_max ? Number(rent_max) : null}::integer)
            GROUP BY l.id
            ORDER BY l.created_at DESC
            `;
    res.json({ count: listings.length, listings });
  } catch (error) {
    console.error("Error in getListings: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

//listing details by id
export const getListing = async (req, res) => {
  try {
    const { id } = req.params;

    const [listing] = await sql`
              SELECT l.*,
              u.name AS landlord_name, u.phone AS landlord_phone,
              COALESCE(ROUND(AVG(r.rating):: numeric, 1), 0) AS avg_rating,
              COUNT(DISTINCT r.id) AS review_count
              FROM listings l
              JOIN users u ON u.id = l.landlord_id
              LEFT JOIN reviews r ON r.lsiting_id = l.id
              WHERE l.id = ${id} AND l.is_active = true
              GROUP BY l.id, u.name, u.phone
        `;
    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }
    const photos = await sql`
     SELECT id, url, is_primary FROM photos WHERE listing_id = ${id} ORDER BY is_primary DESC
    `;
    const amenities = await sql`
     SELECT id, name FROM amenities WHERE listing_id = ${id}
    `;
    const reviews = await sql`
     SELECT r.id, r.rating, r.comment, r.created_at,u.name AS reviewer_name FROM reviews r JOIN users u ON u.id = r.student_id where r.listing_id = ${id} ORDER BY r.created_at DESC LIMIT 10
    `;
  } catch (error) {
    console.error("Error in getListing: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const createListing = async (req, res) => {
  try {
    const {
      title,
      description,
      address,
      city,
      pincode,
      lat,
      lng,
      rent_min,
      rent_max,
      type,
      gender,
      available_rooms,
      total_rooms,
      amenities,
    } = req.body;
    if (!title || !address || !city || !rent_min || !type || !gender) {
      return res
        .status(400)
        .json({ error: "Please provide all required fields" });
    }
    const [listing] = await sql`
      INSERT INTO listings (landlord_id, title, description, address, city, pincode, lat, lng, rent_min, rent_max, type, gender, available_rooms, total_rooms)
       VALUES (${req.user.id}, ${title}, ${description ?? null}, ${address}, ${city}, ${pincode ?? null}, ${lat ?? null}, ${lng ?? null},${rent_min}, ${rent_max ?? null}, ${type}, ${gender},
         ${available_rooms ?? 0}, ${total_rooms ?? null} )
      RETURNING *
    `;

    if (amenities && Array.isArray(amenities) && amenities.length > 0) {
      for (const name of amenities) {
        await sql`
          INSERT INTO amenities (listing_id, name) VALUES (${listing.id}, ${name})
        `;
      }
    }
    res.status(201).json({ message: "Listing created successfully.", listing });
  } catch (error) {
    console.error("createListing error:", error);
    res.status(500).json({ error: "Failed to create listing." });
  }
};

export const updateListing = async (req, res) => {
  try {
    const { id } = req.params;

    // Check ownership
    const [existing] = await sql`
      SELECT id, landlord_id FROM listings WHERE id = ${id}
    `;

    if (!existing) return res.status(404).json({ error: "Listing not found." });
    if (existing.landlord_id !== req.user.id) {
      return res
        .status(403)
        .json({ error: "You can only edit your own listings." });
    }

    const {
      title,
      description,
      address,
      city,
      pincode,
      lat,
      lng,
      rent_min,
      rent_max,
      type,
      gender,
      available_rooms,
      total_rooms,
      is_active,
    } = req.body;

    const [updated] = await sql`
      UPDATE listings SET
        title           = COALESCE(${title ?? null}, title),
        description     = COALESCE(${description ?? null}, description),
        address         = COALESCE(${address ?? null}, address),
        city            = COALESCE(${city ?? null}, city),
        pincode         = COALESCE(${pincode ?? null}, pincode),
        lat             = COALESCE(${lat ?? null}, lat),
        lng             = COALESCE(${lng ?? null}, lng),
        rent_min        = COALESCE(${rent_min ?? null}, rent_min),
        rent_max        = COALESCE(${rent_max ?? null}, rent_max),
        type            = COALESCE(${type ?? null}, type),
        gender          = COALESCE(${gender ?? null}, gender),
        available_rooms = COALESCE(${available_rooms ?? null}, available_rooms),
        total_rooms     = COALESCE(${total_rooms ?? null}, total_rooms),
        is_active       = COALESCE(${is_active ?? null}, is_active),
        updated_at      = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    res.json({ message: "Listing updated.", listing: updated });
  } catch (error) {
    console.error("updateListing error:", error);
    res.status(500).json({ error: "Failed to update listing." });
  }
};

export const deleteListing = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await sql`
      SELECT landlord_id FROM listings WHERE id = ${id}
    `;

    if (!existing) return res.status(404).json({ error: "Listing not found." });
    if (existing.landlord_id !== req.user.id) {
      return res
        .status(403)
        .json({ error: "You can only delete your own listings." });
    }

    await sql`
      UPDATE listings SET is_active = false, updated_at = NOW()
      WHERE id = ${id}
    `;

    res.json({ message: "Listing deleted successfully." });
  } catch (error) {
    console.error("deleteListing error:", error);
    res.status(500).json({ error: "Failed to delete listing." });
  }
};

export const getMyListings = async (req, res) => {
  try {
    const listings = await sql`
      SELECT l.*,
        COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0) AS avg_rating,
        COUNT(DISTINCT r.id) AS review_count,
        MIN(p.url) FILTER (WHERE p.is_primary = true) AS primary_photo
      FROM listings l
      LEFT JOIN reviews r ON r.listing_id = l.id
      LEFT JOIN photos p ON p.listing_id = l.id
      WHERE l.landlord_id = ${req.user.id}
      GROUP BY l.id
      ORDER BY l.created_at DESC
    `;

    res.json({ listings });
  } catch (error) {
    console.error("getMyListings error:", error);
    res.status(500).json({ error: "Failed to fetch your listings." });
  }
};
