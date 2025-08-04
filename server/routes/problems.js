// server/routes/problems.js
const express = require('express');
const router = express.Router();
const Problem = require('../models/Problem');

// @route   GET api/problems
// @desc    Get all problems
router.get('/', async (req, res) => {
  try {
    const problems = await Problem.find().select('-testCases'); // Don't send test cases to the list view
    res.json(problems);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/problems/:id
// @desc    Get a single problem by ID
router.get('/:id', async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);
    if (!problem) {
      return res.status(404).json({ msg: 'Problem not found' });
    }
    res.json(problem);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});


// @route   POST api/problems
// @desc    Create a new problem (for admin use)
router.post('/', async (req, res) => {
  const { title, description, difficulty, testCases } = req.body;
  try {
    const newProblem = new Problem({
      title,
      description,
      difficulty,
      testCases
    });
    const problem = await newProblem.save();
    res.json(problem);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});


module.exports = router;