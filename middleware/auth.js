import jwt from "jsonwebtoken";

export const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized, Please Log in" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach user info to request object
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ error: "Invalid token, Please Log in again" });
  }
};

export const landlordOnly = (req, res, next) => {
  if (req.user.role !== "landlord") {
    return res.status(403).json({ error: "Forbidden, Landlord access only" });
  }
  next();
};

export const studentOnly = (req, res, next) => {
  if (req.user.role !== "student") {
    return res.status(403).json({ error: "Forbidden, Student access only" });
  }
  next();
};
