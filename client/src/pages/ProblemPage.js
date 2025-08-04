import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import io from "socket.io-client";
import CodeMirror from "@uiw/react-codemirror";
import { java } from "@codemirror/lang-java";
import { Box, Button, Typography, CircularProgress } from "@mui/material";

// The default Java template for the editor
const javaTemplate = `import java.util.*;
import java.io.*;

// The main class must be named "Main" for the Judge0 execution environment
public class Main {
    public static void main(String[] args) throws IOException {
        // Use BufferedReader for faster I/O
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        
        // Read the single line of input
        String inputLine = br.readLine();
        
        // --- Your logic goes here ---
        // Example: just print the input back out
        System.out.println("You entered: " + inputLine);
        
        // --- Solve the problem and print the output ---
        // For "Two Sum" with input "[2,7,11,15], 9", you would parse this line
        // and print the result, e.g., System.out.println("[0,1]");
    }
}
`;

const ProblemPage = () => {
  const { id: problemId } = useParams();
  const [problem, setProblem] = useState(null);
  const [myCode, setMyCode] = useState(javaTemplate);
  const [opponentCode, setOpponentCode] = useState(
    "// Waiting for opponent..."
  );
  const [submissionResult, setSubmissionResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentary, setCommentary] = useState([]);
  const socketRef = useRef(null);

  // --- THIS WAS MISSING: useEffect to fetch problem data ---
  useEffect(() => {
    const fetchProblem = async () => {
      try {
        const { data } = await axios.get(`/api/problems/${problemId}`);
        setProblem(data);
      } catch (error) {
        console.error("Failed to fetch problem", error);
      }
    };
    fetchProblem();
  }, [problemId]);

  // --- THIS WAS MISSING: useEffect for WebSocket connection ---
  useEffect(() => {
    socketRef.current = io("http://localhost:5001");
    socketRef.current.emit("joinRoom", problemId);

    socketRef.current.on("opponentCodeChange", (newCode) => {
      setOpponentCode(newCode);
    });

    socketRef.current.on("newCommentary", (data) => {
      setCommentary((prev) => [data.text, ...prev.slice(0, 4)]);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [problemId]);

  const handleCodeChange = (newCode) => {
    setMyCode(newCode);
    socketRef.current.emit("codeChange", { roomId: problemId, newCode });
  };

  const handleSubmit = async () => {
    // --- NEW: Get token from localStorage ---
    const token = localStorage.getItem('token');
    if (!token) {
      alert('You must be logged in to submit a solution.');
      return;
    }

    setIsSubmitting(true);
    setSubmissionResult(null);
    try {
      // --- NEW: Create config object with headers ---
      const config = {
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
      };

      const body = {
        code: myCode,
        language: 'java',
        problemId: problemId,
      };

      // --- NEW: Pass the body and config to axios.post ---
      const { data } = await axios.post('/api/submissions', body, config);
      
      setSubmissionResult(data);
    } catch (error) {
      console.error('Submission failed', error);
      alert('An error occurred during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!problem) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        gap: "2rem",
        flexDirection: { xs: "column", md: "row" },
      }}
    >
      {/* Left Panel: Problem Description and Commentary */}
      <Box sx={{ flex: 1 }}>
        <Typography variant="h4" gutterBottom>
          {problem.title}
        </Typography>
        <Typography paragraph>{problem.description}</Typography>
        <Typography variant="h6">Difficulty: {problem.difficulty}</Typography>

        <Box
          sx={{
            mt: 4,
            border: "1px solid",
            borderColor: "divider",
            padding: "1rem",
            borderRadius: "8px",
          }}
        >
          <Typography variant="h6" color="primary">
            🎤 Live Commentary
          </Typography>
          {commentary.length > 0 ? (
            commentary.map((text, index) => (
              <Typography key={index} sx={{ mt: 1, opacity: 1 - index * 0.2 }}>
                {text}
              </Typography>
            ))
          ) : (
            <Typography sx={{ mt: 1 }} color="text.secondary">
              Waiting for the first move...
            </Typography>
          )}
        </Box>
      </Box>

      {/* Right Panel: Code Editors and Results */}
      <Box
        sx={{ flex: 2, display: "flex", flexDirection: "column", gap: "1rem" }}
      >
        <Typography variant="h5">My Code (Java)</Typography>
        <CodeMirror
          value={myCode}
          height="400px"
          extensions={[java()]}
          onChange={handleCodeChange}
          theme="dark"
        />
        <Typography variant="h5">Opponent's Code</Typography>
        <CodeMirror
          value={opponentCode}
          height="200px"
          extensions={[java()]}
          readOnly={true}
          theme="dark"
        />
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          variant="contained"
          color="primary"
          size="large"
        >
          {isSubmitting ? <CircularProgress size={24} /> : "Submit Code"}
        </Button>

        {submissionResult && (
          <Box
            sx={{
              mt: 2,
              border: "1px solid",
              borderColor: "divider",
              padding: "1rem",
              borderRadius: "8px",
            }}
          >
            <Typography variant="h6">Submission Results</Typography>
            {submissionResult.map((result, index) => (
              <Box
                key={index}
                sx={{
                  mt: 1,
                  p: 1,
                  borderRadius: "4px",
                  background:
                    result.status.description === "Accepted"
                      ? "rgba(0, 245, 212, 0.1)"
                      : "rgba(255, 0, 248, 0.1)",
                }}
              >
                <Typography>
                  <strong>Test Case {index + 1}:</strong>{" "}
                  {result.status.description}
                </Typography>
                {result.stdout && (
                  <pre
                    style={{
                      margin: "0.5rem 0 0 0",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all",
                    }}
                  >
                    Output: {result.stdout.trim()}
                  </pre>
                )}
                {result.stderr && (
                  <pre
                    style={{
                      margin: "0.5rem 0 0 0",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all",
                      color: "red",
                    }}
                  >
                    Error: {result.stderr.trim()}
                  </pre>
                )}
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ProblemPage;
