// const express = require("express");
// const cors = require("cors");
// const morgan = require("morgan");
// require("dotenv").config();

// const { connectDB } = require("./db/index");

// const app = express();
// const PORT = process.env.PORT || 5000;

// app.use(cors());
// app.use(morgan("dev"));
// app.use(express.json());

// connectDB();

// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
require("dotenv").config();

const { connectDB, pool } = require("./db/index");

const app = express();
const PORT = process.env.PORT || 5000;

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

connectDB();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
