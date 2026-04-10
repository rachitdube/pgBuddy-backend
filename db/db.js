import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
dotenv.config();

const DB_URL = process.env.DATABASE_URL;

if (!DB_URL) {
  console.error("DATABASE_URL is not defined in the environment variables.");
  process.exit(1);
}

export const sql = neon(DB_URL);

export async function initDB() {
  try {
    //users table
    await sql`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role VARCHAR(20) CHECK (role IN ('student', 'landlord')) NOT NULL,
                phone VARCHAR(20),
                created_at TIMESTAMP DEFAULT NOW()
            )`;

    //listing Table
    await sql`
            CREATE TABLE IF NOT EXISTS listings (
                id SERIAL PRIMARY KEY,
                landlord_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(200) NOT NULL,
                description TEXT,
                address TEXT NOT NULL,
                city VARCHAR(100) NOT NULL,
                pincode VARCHAR(10),
                lat DECIMAL(9,6),
                lng DECIMAL(9,6),
                rent_min INTEGER NOT NULL,
                rent_max INTEGER NOT NULL,
                type VARCHAR(20) CHECK (type IN ('pg', 'hostel', 'flat')) NOT NULL,
                gender VARCHAR(20) CHECK ( gender IN ('boys', 'girls', 'coed')) NOT NULL,
                available_rooms INTEGER DEFAULT 0,
                total_rooms INTEGER,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )`;

    // Photos table
    await sql`
            CREATE TABLE IF NOT EXISTS photos (
            id SERIAL PRIMARY KEY,
            listing_id INTEGER REFERENCES listings(id) ON DELETE CASCADE,
            url TEXT NOT NULL,
            is_primary BOOLEAN DEFAULT false
      )
    `;

    // Amenities table
    await sql`
      CREATE TABLE IF NOT EXISTS amenities (
        id SERIAL PRIMARY KEY,
        listing_id INTEGER REFERENCES listings(id) ON DELETE CASCADE,
        name VARCHAR(50) NOT NULL
      )
    `;

    // Reviews table
    await sql`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        listing_id  INTEGER REFERENCES listings(id) ON DELETE CASCADE,
        student_id  INTEGER REFERENCES users(id) ON DELETE CASCADE,
        rating INTEGER CHECK (rating BETWEEN 1 AND 5) NOT NULL,
        comment TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(listing_id, student_id)
      )
    `;

    // Saved listings table
    await sql`
      CREATE TABLE IF NOT EXISTS saved_listings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        listing_id INTEGER REFERENCES listings(id) ON DELETE CASCADE,
        saved_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, listing_id)
      )
    `;

    console.log("✅ Database initialized successfully");
  } catch (error) {
    console.error("Error initializing database:", error);
    process.exit(1);
  }
}
