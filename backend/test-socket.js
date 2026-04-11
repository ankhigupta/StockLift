const { io } = require("socket.io-client");
const fetch = require("node-fetch");

async function test() {
  // Login to get token
  const loginRes = await fetch("http://localhost:8000/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "buyer@test.com", password: "123456" }),
  });
  const data = await loginRes.json();
  const accessToken = data.accessToken;
  console.log("Got token:", accessToken.slice(0, 20) + "...");

  // Connect to socket
  const socket = io("http://localhost:8000", {
    auth: { token: accessToken },
  });

  socket.on("connect", () => {
    console.log("✅ Connected to Socket.IO!");
    socket.emit("join:auction", "ccb45587-727e-46f5-975b-9ddf01a33fc0");
    console.log("✅ Joined auction room!");
  });

  socket.on("bid:new", (data) => {
    console.log("🔥 New bid received!", data);
  });

  socket.on("auction:extended", (data) => {
    console.log("⏰ Auction extended!", data);
  });

  socket.on("connect_error", (err) => {
    console.error("❌ Connection error:", err.message);
  });
}

test();