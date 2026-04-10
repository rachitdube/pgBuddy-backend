import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { initDB } from "./db/db.js";
import authRoutes from "./routes/auth.js";
import listingRoutes from "./routes/listings.js";
import savedRoutes from "./routes/saved.js";
import job from "./utils/cron.js";
import savedRoutes from "./routes/saved.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/saved", savedRoutes);
app.use("/api/saved", savedRoutes);

app.use((err, req, res, next) => {
  console.error("Unhadled error: ", err);
  res.status(500).json({ error: "Internal Server Error" });
});

const start = async () => {
  await initDB();
  job.start();
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

start();
