const mongoose = require("mongoose");

const ProblemSchema = new mongoose.Schema({
  title: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  difficulty: {
    type: String,
    enum: ["Easy", "Medium", "Hard"],
    required: true,
  },
  testCases: [
    {
      input: { type: String, required: true },
      expectedOutput: { type: String, required: true },
    },
  ],
});

module.exports = mongoose.model("Problem", ProblemSchema);
