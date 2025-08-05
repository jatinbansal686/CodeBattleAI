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
  List,
  ListItem,
  ListItemText,
  Divider,
  TextField,
  Tabs,
  Tab,
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

  // State for the Run Code feature
  const [customInput, setCustomInput] = useState("");
  const [runOutput, setRunOutput] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const fetchProblem = async () => {
      try {
        const { data } = await axios.get(`/api/problems/${problemId}`);
        setProblem(data);
        if (data.examples && data.examples.length > 0) {
          // A more robust way to get the example input
          const exampleInput = data.examples[0].input
            .split(",")[0]
            .split("=")[1];
          setCustomInput(exampleInput ? exampleInput.trim() : "");
        }
      } catch (error) {
        console.error("Failed to fetch problem", error);
      }
    };
    fetchProblem();
  }, [problemId]);

  const handleCodeChange = (newCode) => {
    setMyCode(newCode);
  };

  const handleRun = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("You must be logged in to run code.");
      return;
    }
    setIsRunning(true);
    setRunOutput(null);
    setActiveTab(1); // Switch to result tab automatically
    try {
      const config = {
        headers: { "Content-Type": "application/json", "x-auth-token": token },
      };
      const body = { code: myCode, language: "java", customInput };
      const { data } = await axios.post("/api/run", body, config);
      setRunOutput(data);
    } catch (error) {
      console.error("Run failed", error);
      setRunOutput({ stderr: "An error occurred while running your code." });
    } finally {
      setIsRunning(false);
    }
  };

  // --- THIS IS THE CORRECTED AND IMPLEMENTED SUBMIT FUNCTION ---
  const handleSubmit = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("You must be logged in to submit a solution.");
      return;
    }

    setIsSubmitting(true);
    setSubmissionResult(null); // Clear previous submission results
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
      setSubmissionResult(data.results); // Set the results for display
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
      <Box sx={{ flex: 1.5, overflowY: "auto", height: "calc(100vh - 120px)" }}>
        <Typography variant="h4" gutterBottom>
          {problem.title}
        </Typography>
        <Typography paragraph color="text.secondary">
          {problem.description}
        </Typography>
        <Divider sx={{ my: 2 }} />
        {problem.examples &&
          problem.examples.map((example, index) => (
            <Box key={index} sx={{ mb: 2 }}>
              <Typography variant="h6">Example {index + 1}:</Typography>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  background: "rgba(255, 255, 255, 0.05)",
                  fontFamily: "monospace",
                  whiteSpace: "pre-wrap",
                }}
              >
                <strong>Input:</strong> {example.input}
                <br />
                <strong>Output:</strong> {example.output}
                {example.explanation && (
                  <>
                    <br />
                    <strong>Explanation:</strong> {example.explanation}
                  </>
                )}
              </Paper>
            </Box>
          ))}
        {problem.constraints && problem.constraints.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6">Constraints:</Typography>
            <List dense>
              {problem.constraints.map((c, i) => (
                <ListItem key={i} sx={{ pl: 2 }}>
                  <ListItemText primary={`• ${c}`} />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </Box>

      {/* Right Panel: Code Editor and Results */}
      <Box
        sx={{ flex: 2, display: "flex", flexDirection: "column", gap: "1rem" }}
      >
        <Typography variant="h5">Your Code (Java)</Typography>
        <CodeMirror
          value={myCode}
          height="450px"
          extensions={[java()]}
          onChange={handleCodeChange}
          theme="dark"
        />

        {/* Console and Test Case Area */}
        <Paper elevation={3} sx={{ flexGrow: 1 }}>
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
          >
            <Tab label="Testcase" />
            <Tab label="Result" />
          </Tabs>
          {activeTab === 0 && (
            <Box p={2}>
              <TextField
                label="Custom Input"
                multiline
                rows={4}
                fullWidth
                variant="outlined"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
              />
            </Box>
          )}
          {activeTab === 1 && (
            <Box
              p={2}
              sx={{
                fontFamily: "monospace",
                whiteSpace: "pre-wrap",
                background: "#1e1e1e",
                color: "#c9d1d9",
                borderRadius: "4px",
                minHeight: "130px",
              }}
            >
              {isRunning ? (
                <CircularProgress size={24} />
              ) : runOutput ? (
                runOutput.stderr ? (
                  <Typography color="error">{runOutput.stderr}</Typography>
                ) : (
                  <Typography>{runOutput.stdout || "No output."}</Typography>
                )
              ) : (
                "Run your code to see the output here."
              )}
            </Box>
          )}
        </Paper>

        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
          <Button onClick={handleRun} disabled={isRunning} variant="outlined">
            {isRunning ? <CircularProgress size={24} /> : "Run"}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            variant="contained"
            color="primary"
          >
            {isSubmitting ? <CircularProgress size={24} /> : "Submit"}
          </Button>
        </Box>

        {/* --- NEW: Display area for the final submission results --- */}
        {submissionResult && (
          <Paper elevation={3} sx={{ mt: 2, p: 2 }}>
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
