import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { SocketContext } from "../context/SocketContext";
import axios from "axios"; // Import axios
import {
  Box,
  Typography,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  ListItemIcon,
  CircularProgress,
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import GroupIcon from "@mui/icons-material/Group";

const LobbyPage = () => {
  const [rooms, setRooms] = useState({});
  const [problems, setProblems] = useState([]); // State to hold real problems
  const [isLoading, setIsLoading] = useState(true); // Loading state for problems
  const socket = useContext(SocketContext);
  const navigate = useNavigate();

  useEffect(() => {
    // --- FIX: Fetch real problems from the database ---
    const fetchProblems = async () => {
      try {
        const { data } = await axios.get("/api/problems");
        setProblems(data);
      } catch (error) {
        console.error("Failed to fetch problems for lobby:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProblems();

    if (!socket) return;

    socket.emit("getLobbyState");
    socket.on("lobbyUpdate", (updatedRooms) => {
      setRooms(updatedRooms);
    });
    socket.on("matchStart", ({ problemId }) => {
      navigate(`/problems/${problemId}`);
    });

    return () => {
      socket.off("lobbyUpdate");
      socket.off("matchStart");
    };
  }, [socket, navigate]);

  const handleCreateRoom = () => {
    if (!socket) {
      alert("Connection not ready, please wait a moment.");
      return;
    }
    // Ensure we have problems to create a room with
    if (problems.length === 0) {
      alert(
        "No problems available to create a match. Please add problems via the backend."
      );
      return;
    }

    // --- FIX: Use the ID and title from the first available problem ---
    const problemToUse = problems[0];

    // In a real app, you'd get the current user's info from an AuthContext
    const user = {
      id: `user_${Date.now()}`,
      username: "Player" + Math.floor(Math.random() * 100),
    };

    socket.emit("createRoom", {
      problemId: problemToUse._id, // Use the real _id from the database
      problemTitle: problemToUse.title,
      user: user,
    });
  };

  const handleJoinRoom = (roomId) => {
    if (!socket) return;
    const user = {
      id: `user_${Date.now()}`,
      username: "Player" + Math.floor(Math.random() * 100),
    };
    socket.emit("joinRoom", { roomId, user });
  };

  return (
    <Box>
      <Typography
        variant="h3"
        component="h1"
        gutterBottom
        align="center"
        sx={{ fontWeight: "bold" }}
      >
        Game Lobby
      </Typography>
      <Button
        variant="contained"
        startIcon={<AddCircleOutlineIcon />}
        onClick={handleCreateRoom}
        sx={{ mb: 4 }}
        disabled={isLoading || problems.length === 0}
      >
        Create New Match
      </Button>

      <Paper
        elevation={3}
        sx={{ p: 2, background: "transparent", backdropFilter: "blur(5px)" }}
      >
        <Typography variant="h5" gutterBottom>
          Available Rooms
        </Typography>
        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
            <CircularProgress />
          </Box>
        ) : (
          <List>
            {Object.values(rooms).length > 0 ? (
              Object.values(rooms).map((room) => (
                <React.Fragment key={room.id}>
                  <ListItem
                    secondaryAction={
                      <Button
                        variant="outlined"
                        onClick={() => handleJoinRoom(room.id)}
                        disabled={room.status === "full"}
                      >
                        {room.status === "full" ? "In Progress" : "Join"}
                      </Button>
                    }
                  >
                    <ListItemIcon>
                      <GroupIcon
                        color={room.status === "full" ? "error" : "success"}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={room.problemTitle}
                      secondary={`Players: ${room.players
                        .map((p) => p.username)
                        .join(", ")} (${room.players.length}/2)`}
                    />
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))
            ) : (
              <Typography sx={{ p: 2 }} color="text.secondary">
                No available rooms. Why not create one?
              </Typography>
            )}
          </List>
        )}
      </Paper>
    </Box>
  );
};

export default LobbyPage;
