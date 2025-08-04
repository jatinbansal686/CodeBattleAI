// const express = require("express");
// const router = express.Router();
// const axios = require("axios");
// const Problem = require("../models/Problem");
// const { publisherClient } = require("../config/redis");

// const JUDGE0_API_URL = "https://judge0-ce.p.rapidapi.com/submissions";
// const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
// const RAPIDAPI_HOST = "judge0-ce.p.rapidapi.com";

// router.post("/", async (req, res) => {
//   const { code, language, problemId } = req.body;

//   // --- CHANGE: Updated language map to prioritize Java ---
//   const languageMap = {
//     java: 62, // Java (OpenJDK 13.0.1)
//     javascript: 93,
//     python: 71,
//   };
//   const language_id = languageMap[language];

//   if (!language_id) {
//     return res.status(400).json({ error: "Unsupported language" });
//   }

//   try {
//     const problem = await Problem.findById(problemId);
//     if (!problem) {
//       return res.status(404).json({ error: "Problem not found" });
//     }

//     const submissions = problem.testCases.map((testCase) => ({
//       source_code: code,
//       language_id: language_id,
//       stdin: testCase.input,
//       expected_output: testCase.expectedOutput,
//     }));

//     const options = {
//       method: "POST",
//       url: `${JUDGE0_API_URL}/batch`,
//       params: { base64_encoded: "false", fields: "*" },
//       headers: {
//         "content-type": "application/json",
//         "X-RapidAPI-Key": RAPIDAPI_KEY,
//         "X-RapidAPI-Host": RAPIDAPI_HOST,
//       },
//       data: { submissions: submissions },
//     };

//     const judge0Response = await axios.request(options);
//     const tokens = judge0Response.data.map((s) => s.token).join(",");

//     await new Promise((resolve) => setTimeout(resolve, 4000)); // Increased wait time for Java compilation

//     const resultOptions = {
//       method: "GET",
//       url: `${JUDGE0_API_URL}/batch`,
//       params: { tokens: tokens, base64_encoded: "false", fields: "*" },
//       headers: {
//         "X-RapidAPI-Key": RAPIDAPI_KEY,
//         "X-RapidAPI-Host": RAPIDAPI_HOST,
//       },
//     };

//     const resultResponse = await axios.request(resultOptions);
//     const results = resultResponse.data.submissions;

//     const passedCount = results.filter(
//       (r) => r.status.description === "Accepted"
//     ).length;
//     const totalCount = results.length;

//     const commentaryEvent = {
//       type: "SUBMISSION_EVALUATED",
//       payload: {
//         problemTitle: problem.title,
//         passedCount: passedCount,
//         totalCount: totalCount,
//         isSuccess: passedCount === totalCount,
//         roomId: problemId,
//       },
//     };

//     await publisherClient.lPush(
//       "commentary_queue",
//       JSON.stringify(commentaryEvent)
//     );

//     res.json(results);
//   } catch (error) {
//     console.error(
//       "Error in Submission Route:",
//       error.response ? error.response.data : error.message
//     );
//     res.status(500).json({ error: "Failed to execute code" });
//   }
// });

// module.exports = router;

// server/routes/submissions.js
const express = require("express");
const router = express.Router();
const axios = require("axios");
const auth = require("../middleware/auth"); // For user authentication
const Problem = require("../models/Problem");
const User = require("../models/User");
const Match = require("../models/Match");
const { publisherClient } = require("../config/redis");

const JUDGE0_API_URL = "https://judge0-ce.p.rapidapi.com/submissions";
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = "judge0-ce.p.rapidapi.com";

// This route is now protected and requires a valid token
router.post("/", auth, async (req, res) => {
  const { code, language, problemId } = req.body;
  const userId = req.user.id; // Get user ID from the auth middleware

  const languageMap = {
    java: 62,
    javascript: 93,
    python: 71,
  };
  const language_id = languageMap[language];

  if (!language_id) {
    return res.status(400).json({ error: "Unsupported language" });
  }

  try {
    // --- Step 1: Fetch problem and user data ---
    const problem = await Problem.findById(problemId);
    if (!problem) {
      return res.status(404).json({ error: "Problem not found" });
    }
    //const user = await User.findById(userId);
    const user = await User.findById(req.user.id); 

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // --- Step 2: Execute code via Judge0 API ---
    const submissions = problem.testCases.map((testCase) => ({
      source_code: code,
      language_id: language_id,
      stdin: testCase.input,
      expected_output: testCase.expectedOutput,
    }));

    const options = {
      method: "POST",
      url: `${JUDGE0_API_URL}/batch`,
      params: { base64_encoded: "false", fields: "*" },
      headers: {
        "content-type": "application/json",
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": RAPIDAPI_HOST,
      },
      data: { submissions: submissions },
    };

    const judge0Response = await axios.request(options);
    const tokens = judge0Response.data.map((s) => s.token).join(",");

    await new Promise((resolve) => setTimeout(resolve, 4000));

    const resultOptions = {
      method: "GET",
      url: `${JUDGE0_API_URL}/batch`,
      params: { tokens: tokens, base64_encoded: "false", fields: "*" },
      headers: {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": RAPIDAPI_HOST,
      },
    };

    const resultResponse = await axios.request(resultOptions);
    const results = resultResponse.data.submissions;

    // --- Step 3: Process results and update stats if successful ---
    const allPassed = results.every((r) => r.status.description === "Accepted");

    if (allPassed) {
      const alreadySolved = user.solvedProblems.includes(problemId);
      if (!alreadySolved) {
        // Update User Stats
        const pointsGained =
          problem.difficulty === "Hard"
            ? 20
            : problem.difficulty === "Medium"
            ? 10
            : 5;
        user.stats.wins += 1;
        user.stats.points += pointsGained;
        user.solvedProblems.push(problemId);
        await user.save();

        // Create a new Match Record
        const newMatch = new Match({
          problem: problemId,
          winner: userId,
          codeSubmitted: code,
        });
        await newMatch.save();
      }
    }

    // --- Step 4: Queue AI commentary event ---
    const passedCount = results.filter(
      (r) => r.status.description === "Accepted"
    ).length;
    const totalCount = results.length;
    const commentaryEvent = {
      type: "SUBMISSION_EVALUATED",
      payload: {
        problemTitle: problem.title,
        passedCount: passedCount,
        totalCount: totalCount,
        isSuccess: allPassed,
        roomId: problemId, // Note: This might need to be the actual room ID in the future
      },
    };
    await publisherClient.lPush(
      "commentary_queue",
      JSON.stringify(commentaryEvent)
    );

    // --- Step 5: Send results back to the client ---
    res.json(results);
  } catch (error) {
    console.error(
      "Error in Submission Route:",
      error.response ? error.response.data : error.message
    );
    res.status(500).json({ error: "Failed to execute code" });
  }
});

module.exports = router;
