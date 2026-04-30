console.log("🔥 script.js loaded");

// =========================
// 👤 USER
// =========================
let username = localStorage.getItem("fb_username");

if (!username || username === "null") {
  username = prompt("Enter your name:") || "Anonymous";
  localStorage.setItem("fb_username", username);
}

console.log("👤 Username:", username);

// =========================
// 🌐 API URL
// =========================
const API = "https://futureristic.onrender.com";

// =========================
// 🔌 SOCKET (REAL-TIME CHAT)
// =========================
const socket = io(API);

let currentRoom = "general";

// =========================
// 🏠 JOIN ROOM
// =========================
function joinRoom(room) {
  currentRoom = room;
  socket.emit("joinRoom", room);

  const box = document.getElementById("chatBox");
  if (box) box.innerHTML = "";

  console.log("📥 Joined room:", room);
}

// =========================
// 💬 RECEIVE MESSAGE
// =========================
socket.on("receiveMessage", (data) => {
  const box = document.getElementById("chatBox");
  if (!box) return;

  const div = document.createElement("div");
  div.className = "chat-msg";
  div.innerHTML = `<b>${data.user}:</b> ${data.message}`;

  box.appendChild(div);
});

// =========================
// 📤 SEND MESSAGE
// =========================
function sendMessage() {
  const input = document.getElementById("chatInput");
  if (!input) return;

  const message = input.value.trim();
  if (!message) return;

  socket.emit("sendMessage", {
    room: currentRoom,
    user: username,
    message
  });

  input.value = "";
}

// =========================
// 🚀 LOAD POSTS
// =========================
async function loadPosts() {
  try {
    const res = await fetch(`${API}/api/posts`);
    if (!res.ok) throw new Error("Failed to fetch posts");

    const posts = await res.json();

    const box = document.getElementById("posts");
    if (!box) return;

    box.innerHTML = "";

    posts.forEach(post => {
      const div = document.createElement("div");
      div.className = "post";

      const commentsHTML = (post.comments || [])
        .map(c => `<div class="comment"><b>${c.user}:</b> ${c.text}</div>`)
        .join("");

      div.innerHTML = `
        <div class="post-user">${post.user}</div>
        <div class="post-text">${post.text}</div>

        <div class="post-actions">
          <button onclick="likePost('${post._id}')">
            ❤️ ${post.likes || 0}
          </button>
        </div>

        <!-- COMMENT INPUT -->
        <div class="comment-box">
          <input id="c-${post._id}" placeholder="Write a comment..." />
          <button onclick="commentPost('${post._id}')">Send</button>
        </div>

        <!-- COMMENTS -->
        <div class="comments">
          ${commentsHTML}
        </div>
      `;

      box.appendChild(div);
    });

  } catch (err) {
    console.log("❌ Error loading posts:", err);
  }
}

// =========================
// ➕ CREATE POST
// =========================
async function createPost() {
  const input = document.getElementById("postInput");
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  try {
    const res = await fetch(`${API}/api/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user: username,
        text
      })
    });

    if (!res.ok) throw new Error("Failed to create post");

    input.value = "";
    loadPosts();

  } catch (err) {
    console.log("❌ Error creating post:", err);
  }
}

// =========================
// ❤️ LIKE POST
// =========================
async function likePost(id) {
  try {
    const res = await fetch(`${API}/api/posts/like/${id}`, {
      method: "PUT"
    });

    if (!res.ok) throw new Error("Like failed");

    loadPosts();

  } catch (err) {
    console.log("❌ Error liking post:", err);
  }
}

// =========================
// 💬 COMMENT POST
// =========================
async function commentPost(id) {
  const input = document.getElementById(`c-${id}`);
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  try {
    const res = await fetch(`${API}/api/posts/comment/${id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        user: username,
        text
      })
    });

    if (!res.ok) throw new Error("Comment failed");

    input.value = "";
    loadPosts();

  } catch (err) {
    console.log("❌ Error commenting:", err);
  }
}

// =========================
// 🟢 ONLINE USERS
// =========================
const onlineUsers = ["David", "Sarah", "John", "Amaka"];

function renderOnlineUsers() {
  const box = document.getElementById("onlineUsers");
  if (!box) return;

  box.innerHTML = onlineUsers
    .filter(u => u !== username)
    .map(u => `<div class="online-user">🟢 ${u}</div>`)
    .join("");
}

// =========================
// INIT
// =========================
window.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 DOM ready");

  renderOnlineUsers();
  loadPosts();

  // AUTO JOIN DEFAULT ROOM
  joinRoom("general");
});