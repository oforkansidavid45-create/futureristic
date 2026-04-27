const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/user");

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    // check if user exists
    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).json("User already exists");
    }

    // hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // create user
    user = new User({
      username,
      password: hashedPassword
    });

    await user.save();

    res.json("User registered successfully");

  } catch (err) {
    res.status(500).json(err.message);
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json("User not found");
    }

    // compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json("Wrong password");
    }

    res.json({
      message: "Login successful",
      username: user.username
    });

  } catch (err) {
    res.status(500).json(err.message);
  }
});

module.exports = router;