const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const runMigrations = async () => {
  const migrationsDir = path.join(__dirname, "migrations");
  const files = fs.readdirSync(migrationsDir).sort();

  console.log("Running migrations...");

  for (const file of files) {
    if (file.endsWith(".sql")) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      try {
        await pool.query(sql);
        console.log(` SUCCEEDED ${file}`);
      } catch (error) {
        console.error(` NOT SUCCEEDED ${file}: ${error.message}`);
        process.exit(1);
      }
    }
  }

  console.log("All migrations completed successfully");
  await pool.end();
};

runMigrations();