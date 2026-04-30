console.log("🔥 script.js loaded");

// =========================
// 👤 USER (FIXED)
// =========================
let username = localStorage.getItem("fb_username");

if (!username || username === "null" || username === "undefined") {
  username = prompt("Enter your name:")?.trim();

  if (!username) {
    username = "Anonymous";
  }

  localStorage.setItem("fb_username", username);
}

console.log("👤 Username:", username);

// =========================
// 🌐 API URL
// =========================
const API = "https://futureristic.onrender.com";

// =========================
// 🔌 SOCKET
// =========================
const socket = io(API);

let currentChatUser = null;

// register user
socket.emit("register", username);

// =========================
// 💬 OPEN CHAT (DM)
// =========================
function openChat(user) {
  currentChatUser = user;

  document.getElementById("chatBox").innerHTML = "";
  document.getElementById("chatTitle").innerText = "💬 Chat with " + user;

  socket.emit("joinPrivateRoom", {
    user1: username,
    user2: user
  });

  console.log("💬 Chat opened with:", user);
}

// =========================
// 📤 SEND MESSAGE (DM)
// =========================
function sendMessage() {
  const input = document.getElementById("chatInput");
  if (!input) return;

  const message = input.value.trim();
  if (!message || !currentChatUser) return;

  socket.emit("privateMessage", {
    from: username,
    to: currentChatUser,
    message
  });

  addMessage("You", message);
  input.value = "";
}

// =========================
// 📩 RECEIVE MESSAGE
// =========================
socket.on("privateMessage", (data) => {
  if (data.from === currentChatUser || data.to === username) {
    addMessage(data.from, data.message);
  }
});

// =========================
// 🧾 UI MESSAGE
// =========================
function addMessage(user, message) {
  const box = document.getElementById("chatBox");

  const div = document.createElement("div");
  div.className = "chat-msg";
  div.innerHTML = `<b>${user}:</b> ${message}`;

  box.appendChild(div);
}

// =========================
// 🚀 LOAD POSTS
// =========================
async function loadPosts() {
  try {
    const res = await fetch(`${API}/api/posts`);
    const posts = await res.json();

    const box = document.getElementById("posts");
    box.innerHTML = "";

    posts.forEach(post => {
      const div = document.createElement("div");
      div.className = "post";

      const commentsHTML = (post.comments || [])
        .map(c => `<div><b>${c.user}:</b> ${c.text}</div>`)
        .join("");

      div.innerHTML = `
        <div class="post-user">${post.user}</div>
        <div class="post-text">${post.text}</div>

        <button onclick="likePost('${post._id}')">
          ❤️ ${post.likes || 0}
        </button>

        <div>
          <input id="c-${post._id}" placeholder="Comment..." />
          <button onclick="commentPost('${post._id}')">Send</button>
        </div>

        <div>${commentsHTML}</div>
      `;

      box.appendChild(div);
    });

  } catch (err) {
    console.log("❌ Error loading posts:", err);
  }
}

// =========================
// ➕ POST
// =========================
async function createPost() {
  const input = document.getElementById("postInput");
  const text = input.value.trim();

  if (!text) return;

  await fetch(`${API}/api/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user: username, text })
  });

  input.value = "";
  loadPosts();
}

// =========================
// ❤️ LIKE
// =========================
async function likePost(id) {
  await fetch(`${API}/api/posts/like/${id}`, {
    method: "PUT"
  });

  loadPosts();
}

// =========================
// 💬 COMMENT
// =========================
async function commentPost(id) {
  const input = document.getElementById(`c-${id}`);
  const text = input.value.trim();

  if (!text) return;

  await fetch(`${API}/api/posts/comment/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user: username,
      text
    })
  });

  input.value = "";
  loadPosts();
}

// =========================
// 🟢 REAL ONLINE USERS (IMPORTANT FIX)
// =========================
let onlineUsers = [];

socket.on("onlineUsers", (users) => {
  onlineUsers = users;
  renderOnlineUsers();
});

function renderOnlineUsers() {
  const box = document.getElementById("onlineUsers");
  if (!box) return;

  box.innerHTML = onlineUsers
    .filter(u => u !== username)
    .map(u => `
      <div class="online-user" onclick="openChat('${u}')">
        🟢 ${u}
      </div>
    `)
    .join("");
}

// =========================
// INIT
// =========================
window.addEventListener("DOMContentLoaded", () => {
  renderOnlineUsers();
  loadPosts();
});