require("dotenv").config();
const express = require("express");
const cors = require("cors");
const customerRoutes = require("./routes/customers");
const productRoutes = require("./routes/products");
const orderRoutes = require("./routes/orders");
const db = require("./config/db");

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN || "http://localhost:3000",
  }),
);
app.use(express.json());

// Routes
app.use("/api/customers", customerRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Internal Server Error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

app.listen(PORT, () => {
  db.query("SELECT NOW()", (err, res) => {
    if (err) {
      console.error("Database connection failed:", err.message);
    } else {
      console.log("Database connected:", res.rows[0].now);
    }
  });
  console.log(`Server running on port ${PORT}`);
});
