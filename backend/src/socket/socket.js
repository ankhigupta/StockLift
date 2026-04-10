const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter");
const { createClient } = require("ioredis");
const jwt = require("jsonwebtoken");

let io;

const initSocket = async (httpServer) => {
  // Creating Socket.IO server
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Connecting to Upstash Redis for Pub/Sub
  const pubClient = createClient(process.env.UPSTASH_REDIS_URL);
  const subClient = pubClient.duplicate();

  await Promise.all([pubClient.connect(), subClient.connect()]);

  // Attaching Redis adapter — this is what makes multi-server broadcasting work
  io.adapter(createAdapter(pubClient, subClient));

  console.log("Socket.IO connected to Redis");

  // Middleware — authenticate socket connections using JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("No token provided"));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      return next(new Error("Invalid token"));
    }
  });

  // Handling connections
  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.user.id}`);

    // Joining auction room
    // When a user opens an auction detail screen, they join that auction's room
    // This means they only receive events for that specific auction
    socket.on("join:auction", (auction_id) => {
      socket.join(`auction:${auction_id}`);
      console.log(`User ${socket.user.id} joined auction:${auction_id}`);
    });

    // Leaving auction room
    // When user navigates away from auction detail screen
    socket.on("leave:auction", (auction_id) => {
      socket.leave(`auction:${auction_id}`);
      console.log(`User ${socket.user.id} left auction:${auction_id}`);
    });

    // Handling disconnection
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.user.id}`);
    });
    
    // Sync auction state on reconnect
    // App sends this after reconnecting to get the latest data
    socket.on("auction:sync", async (auction_id) => {
    try {
        const { pool } = require("../db/index");
        const result = await pool.query(
        "SELECT id, current_highest_bid, end_time, status FROM auctions WHERE id = $1",
        [auction_id]
        );
        if (result.rows.length > 0) {
        socket.emit("auction:state", result.rows[0]);
        }
    } catch (err) {
        console.error("Sync error:", err.message);
    }
    });
  });

  return io;
};

// Getting the io instance from anywhere in the app
const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }
  return io;
};

module.exports = { initSocket, getIO };