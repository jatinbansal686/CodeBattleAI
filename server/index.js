require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const { connectRedis, subscriberClient } = require("./config/redis");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const server = http.createServer(app);
let rooms = {};
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});
const PORT = process.env.PORT || 5001;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const startCommentaryWorker = async () => {
  console.log("Commentary worker is ready and listening...");
  while (true) {
    try {
      const result = await subscriberClient.brPop("commentary_queue", 0);
      const event = JSON.parse(result.element);
      const { payload } = event;
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

const startServer = async () => {
  try {
    await connectDB();
    await connectRedis();

    app.use(cors());
    app.use(express.json());
    app.use((req, res, next) => {
      req.io = io;
      next();
    });
    app.use("/api/auth", require("./routes/auth"));
    app.use("/api/problems", require("./routes/problems"));
    app.use("/api/submissions", require("./routes/submissions"));
    app.use("/api/leaderboard", require("./routes/leaderboard"));
    app.use("/api/users", require("./routes/users"));

    io.on("connection", (socket) => {
      console.log(`A user connected: ${socket.id}`);

      socket.on("getLobbyState", () => socket.emit("lobbyUpdate", rooms));

      socket.on("createRoom", ({ problemId, problemTitle, user }) => {
        const roomId = `room-${socket.id}`;
        rooms[roomId] = {
          id: roomId,
          problemId,
          problemTitle,
          players: [
            { id: user.id, username: user.username, socketId: socket.id },
          ],
          status: "waiting",
          winner: null,
        };
        socket.join(roomId);
        io.emit("lobbyUpdate", rooms);
        console.log(`Room created: ${roomId}`);
      });

      socket.on("joinRoom", ({ roomId, user }) => {
        const room = rooms[roomId];
        if (room && room.players.length < 2) {
          room.players.push({
            id: user.id,
            username: user.username,
            socketId: socket.id,
          });
          room.status = "in_progress";
          socket.join(roomId);
          const player1SocketId = room.players[0].socketId;
          const player2SocketId = room.players[1].socketId;
          io.to(player1SocketId)
            .to(player2SocketId)
            .emit("matchStart", { roomId, problemId: room.problemId });
          io.emit("lobbyUpdate", rooms);
          console.log(
            `User ${user.username} joined room ${roomId}. Match starting.`
          );
        }
      });

      socket.on("joinBattleRoom", (roomId) => {
        socket.join(roomId);
        console.log(`User ${socket.id} joined battle room ${roomId}`);
      });

      socket.on("codeChange", (data) => {
        const { roomId, newCode } = data;
        socket.to(roomId).emit("opponentCodeChange", newCode);
      });

      socket.on("iWon", ({ roomId, user }) => {
        const room = rooms[roomId];
        if (room && !room.winner) {
          room.winner = user.username;
          room.status = "finished";
          io.to(roomId).emit("matchEnd", { winner: user.username });
          console.log(
            `Match ended for room ${roomId}. Winner: ${user.username}`
          );
          io.emit("lobbyUpdate", rooms);
        }
      });

      socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
        for (const roomId in rooms) {
          const room = rooms[roomId];
          const playerIndex = room.players.findIndex(
            (p) => p.socketId === socket.id
          );
          if (playerIndex !== -1) {
            if (room.status === "in_progress" && room.players.length === 2) {
              const winner = room.players.find((p) => p.socketId !== socket.id);
              if (winner) {
                room.winner = winner.username;
                room.status = "finished";
                io.to(roomId).emit("matchEnd", {
                  winner: winner.username,
                  reason: "Opponent disconnected.",
                });
              }
            }
            delete rooms[roomId];
            io.emit("lobbyUpdate", rooms);
            break;
          }
        }
      });
    });

    app.get("/", (req, res) => {
      res.send("CodeBattle.AI Server is running with WebSockets! 🚀");
    });

    server.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });

    startCommentaryWorker();
  } catch (error) {
    console.error("Failed to start the server:", error);
    process.exit(1);
  }
};

startServer();
