const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { initCronJobs } = require("./jobs/auction.jobs");
require("dotenv").config();

const { connectDB, pool } = require("./db/index");
const routes = require("./routes/index");
const { errorHandler, notFound } = require("./middleware/error.middleware");

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      database: "connected",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      timestamp: new Date().toISOString(),
      database: "disconnected",
    });
  }
});
app.use("/api/v1", routes);

app.use(notFound);
app.use(errorHandler);

connectDB();
initCronJobs();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
