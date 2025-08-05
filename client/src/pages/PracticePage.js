import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import CodeMirror from "@uiw/react-codemirror";
import { java } from "@codemirror/lang-java";
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Paper,
} from "@mui/material";

const javaTemplate = `import java.util.*;
import java.io.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        String inputLine = br.readLine();
        System.out.println("You entered: " + inputLine);
    }
}
`;

const PracticePage = () => {
  const { problemId } = useParams();
  const [problem, setProblem] = useState(null);
  const [myCode, setMyCode] = useState(javaTemplate);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleCodeChange = (newCode) => {
    setMyCode(newCode);
  };

  const handleSubmit = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("You must be logged in to submit a solution.");
      return;
    }

    setIsSubmitting(true);
    setSubmissionResult(null);
    try {
      const config = {
        headers: { "Content-Type": "application/json", "x-auth-token": token },
      };
      const body = {
        code: myCode,
        language: "java",
        problemId: problemId,
      };
      // The API response includes 'results' and 'allPassed'
      const { data } = await axios.post("/api/submissions", body, config);
      setSubmissionResult(data.results);
    } catch (error) {
      console.error("Submission failed", error);
      alert("An error occurred during submission.");
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
        flexDirection: { xs: "column", lg: "row" },
      }}
    >
      {/* Left Panel: Problem Description */}
      <Box sx={{ flex: 1 }}>
        <Typography variant="h4" gutterBottom>
          {problem.title}
        </Typography>
        <Typography paragraph>{problem.description}</Typography>
        <Typography variant="h6">Difficulty: {problem.difficulty}</Typography>
      </Box>

      {/* Right Panel: Code Editor and Results */}
      <Box
        sx={{ flex: 2, display: "flex", flexDirection: "column", gap: "1rem" }}
      >
        <Typography variant="h5">Your Code (Java)</Typography>
        <CodeMirror
          value={myCode}
          height="500px"
          extensions={[java()]}
          onChange={handleCodeChange}
          theme="dark"
        />
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          variant="contained"
          color="primary"
          size="large"
        >
          {isSubmitting ? <CircularProgress size={24} /> : "Submit & Run"}
        </Button>

        {submissionResult && (
          <Paper
            elevation={3}
            sx={{
              mt: 2,
              p: 2,
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
                      margin: 0,
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
                      margin: 0,
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
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default PracticePage;
