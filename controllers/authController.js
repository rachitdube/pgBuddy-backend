import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sql } from "../db/db.js";

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );
};

export const register = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    if (!name || !email || !password || !role) {
      return res
        .status(400)
        .json({ error: "Please provide all required fields" });
    }
    if (!["student", "landlord"].includes(role)) {
      return res
        .status(400)
        .json({ error: "Role must be either student or landlord" });
    }

    const [existing] = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existing) {
      return res.status(400).json({ error: "Email already in use" });
    }
    const password_hash = await bcrypt.hash(password, 10);

    const [user] = await sql`
            INSERT INTO users ( name, email, password_hash, role, phone)
            VALUES (${name}, ${email}, ${password_hash}, ${role}, ${phone ?? null})
            RETURNING id, name, email, role, phone, created_at
        `;

    const token = generateToken(user);

    res
      .status(201)
      .json({ message: "User registered successfully", user, token });
  } catch (error) {
    console.error("Error in register: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Please provide email and password" });
    }
    const [user] = await sql`SELECT * FROM users WHERE email = ${email}`;
    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid email or password" });
    }
    const token = generateToken(user);
    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
      token,
    });
  } catch (error) {
    console.error("Error in login: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getMe = async (req, res) => {
  try {
    const [user] =
      await sql`SELECT id, name, email, role, phone, created_at FROM users WHERE id = ${req.user.id}`;
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ user });
  } catch (error) {
    console.error("Error in getMe: ", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
