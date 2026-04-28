const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/user");

// =========================
// REGISTER
// =========================
router.post("/register", async (req, res) => {
  try {
    let { username, password } = req.body;

    // basic validation
    if (!username || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    username = username.trim().toLowerCase();

    // check if user exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: "Username already taken" });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // create user
    const newUser = new User({
      username,
      password: hashedPassword
    });

    await newUser.save();

    res.json({
      message: "User registered successfully",
      username: newUser.username
    });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});


// =========================
// LOGIN
// =========================
router.post("/login", async (req, res) => {
  try {
    let { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    username = username.trim().toLowerCase();

    // find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    res.json({
      message: "Login successful",
      username: user.username
    });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;