require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
// --- CHANGE HERE: Import the dedicated subscriberClient for the worker ---
const { connectRedis, subscriberClient } = require("./config/redis");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- Main Application Logic ---
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});
const PORT = process.env.PORT || 5001;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- AI Commentary Worker ---
const startCommentaryWorker = async () => {
  console.log("Commentary worker is ready and listening...");
  while (true) {
    try {
      // --- CHANGE HERE: Use the subscriberClient for the blocking command ---
      const result = await subscriberClient.brPop("commentary_queue", 0);
      const event = JSON.parse(result.element);
      const { payload } = event;
      //   const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      // NEW, CORRECTED CODE
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash-latest",
      });
      const prompt = `You are an excited eSports commentator for a competitive coding battle.
      A user just submitted a solution for a problem titled "${payload.problemTitle}".
      They passed ${payload.passedCount} out of ${payload.totalCount} test cases.
      Generate a short, punchy, and exciting commentary line about this event.
      - If they passed all tests, be celebratory.
      - If they passed some but not all, be encouraging but note the partial success.
      - If they passed none, be sympathetic but highlight the challenge.
      Commentary:`;
      const generationResult = await model.generateContent(prompt);
      const response = await generationResult.response;
      const commentaryText = response.text().trim();
      io.to(payload.roomId).emit("newCommentary", { text: commentaryText });
    } catch (error) {
      console.error("Error in commentary worker:", error);
    }
  }
};

// --- Function to Start the Server ---
const startServer = async () => {
  try {
    // 1. Await critical connections
    await connectDB();
    await connectRedis();

    // 2. Setup middlewares and routes
    app.use(cors());
    app.use(express.json());
    app.use("/api/auth", require("./routes/auth"));
    app.use("/api/problems", require("./routes/problems"));
    app.use("/api/submissions", require("./routes/submissions"));
    app.use("/api/leaderboard", require("./routes/leaderboard"));

    // 3. Setup Socket.IO listeners
    io.on("connection", (socket) => {
      console.log("A user connected:", socket.id);
      socket.on("joinRoom", (roomId) => {
        socket.join(roomId);
        console.log(`User ${socket.id} joined room ${roomId}`);
      });
      socket.on("codeChange", (data) => {
        const { roomId, newCode } = data;
        socket.to(roomId).emit("opponentCodeChange", newCode);
      });
      socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
      });
    });

    app.get("/", (req, res) => {
      res.send("CodeBattle.AI Server is running with WebSockets! 🚀");
    });

    // 4. Start the server listening for requests
    server.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });

    // 5. Start the background worker AFTER everything is ready
    startCommentaryWorker();
  } catch (error) {
    console.error("Failed to start the server:", error);
    process.exit(1);
  }
};

// --- Run the application ---
startServer();
