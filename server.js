// ================= HELPERS =================
function cleanName(name) {
  if (!name) return "";

  return name
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}
require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const bcrypt = require("bcrypt");
const multer = require("multer");
const cloudinary = require("./config/cloudinary");

// ================= MODELS =================
const Post = require("./models/Post");
const Message = require("./models/Message");
const User = require("./models/Users");

// ================= APP INIT =================
const app = express();
const server = http.createServer(app);

// ================= MIDDLEWARE =================
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "client")));
app.use("/uploads",express.static("uploads"));
// ================= SOCKET =================
const io = new Server(server, {
  cors: { origin: "*" }
});

// ================= USERS STORE =================
let users = {};
let friends = {};        // confirmed friends
let requests = {};       // pending requests

// ================= HELPERS =================

app.get("/api/friend-requests/:user", (req, res) => {
  const user = cleanName(req.params.user);

  if (!user) {
    return res.status(400).json({ error: "Missing user" });
  }

  return res.json(requests[user] || []);
});
app.get("/test", (req, res) => {
  res.send("Backend working");
});
function ensureUser(obj, key) {
  if (!obj[key]) obj[key] = [];
}
// ================= AUTH SIGNUP =================
app.post("/api/auth/signup", async (req, res) => {
  try {
    console.log("BODY:", req.body);

    let { username, password } = req.body;
    if (password.length < 4) {
  return res.status(400).json({
    error: "Password too short"
  });
}

    if (!username || !password) {
      return res.status(400).json({ error: "Fill all fields" });
    }

   username = cleanName(username);

    const exists = await User.findOne({ username });

    if (exists) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      password: hashed
    });

    console.log("USER CREATED:", user);

    res.json({ message: "User created", user: user.username });

  } catch (err) {
    console.log("❌ SIGNUP ERROR FULL:", err);
    res.status(500).json({ error: err.message });
  }
});



// ================= AUTH LOGIN =================
app.post("/api/auth/login", async (req, res) => {

  try {

    let { username, password } = req.body;

    console.log("LOGIN REQUEST:", req.body);

    // ================= VALIDATION =================
    if (!username || !password) {
      return res.status(400).json({
        error: "Fill all fields"
      });
    }

  username = cleanName(username);

    // ================= FIND USER =================
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(400).json({
        error: "User not found"
      });
    }

    // ================= CHECK PASSWORD =================
    const match = await bcrypt.compare(
      password,
      user.password
    );

    if (!match) {
      return res.status(400).json({
        error: "Wrong password"
      });
    }

    // ================= SUCCESS =================
    res.json({
      message: "Login successful",
      user: username
    });

  } catch (err) {

    console.log("❌ LOGIN ERROR:", err);

    res.status(500).json({
      error: "Server error"
    });

  }

});

// ================= GET PROFILE =================

app.get("/api/user/:username", async (req, res) => {

  try {

    const username =
      cleanName(req.params.username);

    const user =
      await User.findOne({ username });

    if (!user) {
      return res.status(404).json({
        error: "User not found"
      });
    }

    res.json({
      username: user.username,
      profilePic: user.profilePic || ""
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      error: "Server error"
    });

  }

});

// ================= PROFILE PIC =================

const storage = multer.memoryStorage();

const upload = multer({ storage });

app.post(
"/api/posts",
upload.fields([
{name:"image",maxCount:1},
{name:"video",maxCount:1}
]),
async(req,res)=>{

try{

const {user,text} = req.body;

let image = "";
let video = "";

if(req.files?.image){

image =
req.files.image[0].path;

}

if(req.files?.video){

video =
req.files.video[0].path;

}

const post = new Post({

user,
text,
image,
video,
likes:0,
likedBy:[],
comments:[]

});

await post.save();

res.json(post);

}catch(err){

console.log("POST ERROR:",err);

res.status(500).json({
error:"Failed to create post"
});

}

});

app.post(
"/api/upload-profile",
upload.single("image"),

async (req,res)=>{

try{

const username =
cleanName(req.body.username);

if(!req.file){

return res.status(400).json({
error:"No image"
});

}

const base64 =
`data:${req.file.mimetype};base64,${
req.file.buffer.toString("base64")
}`;

const uploaded =
await cloudinary.uploader.upload(
base64,
{
folder:"futurebook_profiles"
}
);

const updatedUser =
await User.findOneAndUpdate(

{ username },

{
profilePic:
uploaded.secure_url
},

{ new:true }

);

if(!updatedUser){

return res.status(404).json({
error:"User not found"
});

}

io.emit("profileUpdated",{
username,
profilePic:
updatedUser.profilePic
});

res.json({
profilePic:
updatedUser.profilePic
});

}catch(err){

console.log(
"PROFILE UPLOAD ERROR:",
err
);

res.status(500).json({
error:"Upload failed"
});

}

});

// ================= LOAD MESSAGES =================
app.get("/api/messages/:user1/:user2", async (req, res) => {
  try {
   const user1 = cleanName(req.params.user1);
     const user2 = cleanName(req.params.user2);
    const messages = await Message.find({
      $or: [
        { from: user1, to: user2 },
        { from: user2, to: user1 }
      ]
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    console.log("❌ MESSAGE LOAD ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/user/:username", async (req,res)=>{

try{

const user = await User.findOne({
username:req.params.username
});

if(!user){

return res.json({
profilePic:"https://i.imgur.com/HeIi0wU.png"
});

}

res.json({
profilePic:user.profilePic
});

}catch(err){

console.log(err);

res.status(500).json({
error:"Server error"
});

}

});


// ================= SOCKET EVENTS =================

// ================= SOCKET EVENTS =================

io.on("connection", (socket) => {

  console.log("⚡ CONNECTED:", socket.id);

  // ================= REGISTER =================

  socket.on("register", (username) => {

    if (!username) return;

    const clean = cleanName(username);

    socket.username = clean;

    if (!users[clean]) {
      users[clean] = [];
    }

    if (!users[clean].includes(socket.id)) {
      users[clean].push(socket.id);
    }

    console.log("👤 REGISTERED:", clean);

    io.emit("onlineUsers", Object.keys(users));

  });

  // ================= PRIVATE MESSAGE =================

 socket.on("privateMessage", async (data) => {

  try {

    const from = cleanName(data.from);
    const to = cleanName(data.to);

// ensure arrays exist
if (!friends[from]) friends[from] = [];
if (!friends[to]) friends[to] = [];

// check both sides (IMPORTANT)
const isFriend =
  friends[from].includes(to) ||
  friends[to].includes(from);

if (!isFriend) {
  console.log("❌ BLOCKED: not friends");
  return;
}

    const payload = {
      from,
      to,
      message: data.message || "",
      audio: data.audio || null,
      image: data.image || null,
      file: data.file || null
    };

    await new Message(payload).save();

    // SEND TO RECEIVER
    if (users[to]?.length) {
      users[to].forEach(id => {
        io.to(id).emit("privateMessage", payload);
      });
    }

    // SEND TO SENDER
    if (users[from]?.length) {
      users[from].forEach(id => {
        io.to(id).emit("privateMessage", payload);
      });
    }

  } catch (err) {
    console.log("❌ MESSAGE ERROR:", err);
  }

});
  // ================= TYPING =================

  socket.on("typing", ({ from, to }) => {

    to = cleanName(to);

    if (users[to]?.length) {

      users[to].forEach(id => {

        io.to(id).emit(
          "typing",
          { from }
        );

      });

    }

  });

  // ================= STOP TYPING =================

  socket.on("stopTyping", ({ from, to }) => {

    to = cleanName(to);

    if (users[to]?.length) {

      users[to].forEach(id => {

        io.to(id).emit(
          "stopTyping",
          { from }
        );

      });

    }

  });

  // ================= SEEN =================

  socket.on("seen", ({ from, to }) => {

    from = cleanName(from);

    if (users[from]?.length) {

      users[from].forEach(id => {

        io.to(id).emit(
          "messageSeen"
        );

      });

    }

  });

  // ================= DISCONNECT =================

  socket.on("disconnect", () => {

    console.log(
      "❌ DISCONNECTED:",
      socket.id
    );

    if (
      socket.username &&
      users[socket.username]
    ) {

      users[socket.username] =
        users[socket.username].filter(
          id => id !== socket.id
        );

      if (
        users[socket.username].length === 0
      ) {

        delete users[socket.username];

      }

    }

    io.emit(
      "onlineUsers",
      Object.keys(users)
    );

  });

});


// ================= POSTS =================
app.post("/api/posts", async (req, res) => {
  try {
    const { user, text } = req.body;

    if (!user || !text || !text.trim()) {
      return res.status(400).json({ error: "Missing data" });
    }
const userData =
await User.findOne({
username:user
});

const post = await Post.create({

user,
text,

image:imageUrl,
video:videoUrl,

profilePic:
userData?.profilePic || "",

likes:0,

likedBy:[],

comments:[]

});
    res.json(post);
  } catch (err) {
    console.log("❌ POST ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/posts", async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    console.log("❌ GET ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/api/posts/like/:id", async (req,res)=>{

try{

const { username } = req.body;

const post =
await Post.findById(req.params.id);

if(!post){

return res.status(404).json({
error:"Post not found"
});

}

if(!post.likedBy){
post.likedBy = [];
}

const cleanUser =
cleanName(username);

const alreadyLiked =
post.likedBy.includes(cleanUser);

if(alreadyLiked){

post.likedBy =
post.likedBy.filter(
u => u !== cleanUser
);

post.likes -= 1;

}else{

post.likedBy.push(cleanUser);

post.likes += 1;

}

await post.save();

res.json(post);

}catch(err){

console.log(err);

res.status(500).json({
error:"server error"
});

}

});
app.post("/api/posts/comment/:id", async (req, res) => {
  try {
    const { user, text } = req.body;

    if (!user || !text || !text.trim()) {
      return res.status(400).json({ error: "Missing comment" });
    }

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    post.comments.push({
      user: user.trim(),
      text: text.trim()
    });

    await post.save();

    res.json(post);
  } catch (err) {
    console.log("❌ COMMENT ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});
app.post("/api/friend-request", (req, res) => {
  const { from, to } = req.body;

  const f = cleanName(from);
  const t = cleanName(to);

  if (!requests[t]) requests[t] = [];

  if (!requests[t].includes(f)) {
    requests[t].push(f);
  }

  // 🔥 REAL TIME NOTIFICATION
  if (users[t]) {
    users[t].forEach(id => {
      io.to(id).emit("friendRequest", {
        from: f
      });
    });
  }

if (f === t) {
  return res.status(400).json({
    error: "Cannot add yourself"
  });
}

if (
  friends[f]?.includes(t)
) {
  return res.json({
    message: "Already friends"
  });
}



  res.json({ message: "Request sent" });
});
app.post("/api/friend-accept", (req, res) => {
  const { from, to } = req.body;

  ensureUser(friends, from);
  ensureUser(friends, to);

  if (!friends[from].includes(to)) {
    friends[from].push(to);
  }

  if (!friends[to].includes(from)) {
    friends[to].push(from);
  }

  requests[to] = (requests[to] || []).filter(u => u !== from);

  res.json({ message: "friend added" });
});
app.post("/api/friend-reject", (req, res) => {
  const { from, to } = req.body;

  requests[to] =
    (requests[to] || []).filter(u => u !== from);

  res.json({ message: "rejected" });
});
app.get("/api/friends/:user", (req, res) => {
  const user = cleanName(req.params.user);

  res.json(friends[user] || []);
});

// ================= DB =================

// ================= START SERVER =================
const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("🔥 MongoDB connected");

    server.listen(PORT, () => {
      console.log("🚀 Server running on", PORT);
    });

  })
  .catch(err => {
    console.log("❌ Mongo error:", err);
    process.exit(1);
  });

