const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../db/index");

// generating a short-lived access token (15 minutes)
const generateAccessToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );
};

// generating a long-lived refresh token (7 days)
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );
};

// registering a new user
const register = async ({ name, email, password, role }) => {
  // checking if email already exists
  const existingUser = await pool.query(
    "SELECT id FROM users WHERE email = $1",
    [email]
  );

  if (existingUser.rows.length > 0) {
    const error = new Error("Email already registered");
    error.statusCode = 409;
    throw error;
  }

  // hashing the password — 10 is the salt rounds (higher = slower but more secure)
  const hashedPassword = await bcrypt.hash(password, 10);

  // inserting the new user into the database
  const result = await pool.query(
    `INSERT INTO users (name, email, password, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role, created_at`,
    [name, email, hashedPassword, role]
  );

  const user = result.rows[0];

  // generating tokens
  const accessToken = generateAccessToken(user.id, user.role);
  const refreshToken = generateRefreshToken(user.id);

  // saving refresh token to database
  await pool.query(
    "UPDATE users SET refresh_token = $1 WHERE id = $2",
    [refreshToken, user.id]
  );

  return { user, accessToken, refreshToken };
};

// login an existing user
const login = async ({ email, password }) => {
  // finding user by email
  const result = await pool.query(
    "SELECT * FROM users WHERE email = $1",
    [email]
  );

  if (result.rows.length === 0) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  const user = result.rows[0];

  // comparing the provided password with the stored hash
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  // generating new tokens
  const accessToken = generateAccessToken(user.id, user.role);
  const refreshToken = generateRefreshToken(user.id);

  // saving new refresh token to database
  await pool.query(
    "UPDATE users SET refresh_token = $1 WHERE id = $2",
    [refreshToken, user.id]
  );

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    accessToken,
    refreshToken,
  };
};

// getting current logged in user
const getMe = async (userId) => {
  const result = await pool.query(
    "SELECT id, name, email, role, created_at FROM users WHERE id = $1",
    [userId]
  );

  if (result.rows.length === 0) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
};

// refreshing access token using refresh token
const refresh = async (refreshToken) => {
  if (!refreshToken) {
    const error = new Error("Refresh token required");
    error.statusCode = 401;
    throw error;
  }

  // verifying the refresh token is valid
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    const error = new Error("Invalid or expired refresh token");
    error.statusCode = 401;
    throw error;
  }

  // checking the refresh token exists in database (not logged out)
  const result = await pool.query(
    "SELECT id, role, refresh_token FROM users WHERE id = $1",
    [decoded.userId]
  );

  if (result.rows.length === 0 || result.rows[0].refresh_token !== refreshToken) {
    const error = new Error("Invalid refresh token");
    error.statusCode = 401;
    throw error;
  }

  // generating new access token
  const accessToken = generateAccessToken(decoded.userId, result.rows[0].role);

  return { accessToken };
};

// logout — clearing refresh token from database
const logout = async (userId) => {
  await pool.query(
    "UPDATE users SET refresh_token = NULL WHERE id = $1",
    [userId]
  );
};

module.exports = { register, login, getMe, refresh, logout };