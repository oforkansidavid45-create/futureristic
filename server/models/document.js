const mongoose = require("mongoose");

const DocumentSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    index: true
  },

  content: {
    type: String,
    default: ""
  },

  lastEditedBy: {
    type: String,
    default: ""
  }

}, {
  timestamps: true
});

module.exports = mongoose.model("Document", DocumentSchema);