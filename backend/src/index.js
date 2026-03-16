const express = require("express");
const cors = require("cors");

const customersRouter = require("./routes/customers");
const productsRouter = require("./routes/products");
const ordersRouter = require("./routes/orders");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/customers", customersRouter);
app.use("/api/products", productsRouter);
app.use("/api/orders", ordersRouter);

app.use((req, res) => {
  res.status(404).json({
    error: "Route not found"
  });
});

app.use((err, req, res, next) => {

  console.error(err);

  res.status(500).json({
    error: "Internal server error"
  });

});

const PORT = 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});