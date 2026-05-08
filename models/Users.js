const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  profilePic: {
  type: String,
  default: ""
},
  password: {
    type: String,
    required: true
    
  }
});


module.exports = mongoose.model("User", userSchema);

