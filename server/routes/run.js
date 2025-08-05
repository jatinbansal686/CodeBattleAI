// server/routes/run.js
const express = require("express");
const router = express.Router();
const axios = require("axios");
const auth = require("../middleware/auth"); // We still need to know who is running the code

const JUDGE0_API_URL = "https://judge0-ce.p.rapidapi.com/submissions";
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = "judge0-ce.p.rapidapi.com";

// @route   POST api/run
// @desc    Run code with custom input
// @access  Private
router.post("/", auth, async (req, res) => {
  const { code, language, customInput } = req.body;

  const languageMap = { java: 62, javascript: 93, python: 71 };
  const language_id = languageMap[language];

  if (!language_id) {
    return res.status(400).json({ error: "Unsupported language" });
  }

  try {
    // We create a single submission to Judge0
    const options = {
      method: "POST",
      url: JUDGE0_API_URL,
      params: { base64_encoded: "false", wait: "true", fields: "*" },
      headers: {
        "content-type": "application/json",
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": RAPIDAPI_HOST,
      },
      data: {
        source_code: code,
        language_id: language_id,
        stdin: customInput, // Use the custom input provided by the user
      },
    };

    // The 'wait: true' param tells Judge0 to wait for execution to finish
    const judge0Response = await axios.request(options);

    // Send the full result back to the client
    res.json(judge0Response.data);
  } catch (error) {
    console.error(
      "Error with Judge0 Run API:",
      error.response ? error.response.data : error.message
    );
    res.status(500).json({ error: "Failed to run code" });
  }
});

module.exports = router;
