console.log("🔥 script.js loaded");

// =========================
// 👤 USER (FIXED)
// =========================
let username = localStorage.getItem("fb_username");

if (!username || username === "null" || username === "undefined") {
  username = prompt("Enter your name:")?.trim();

  if (!username) username = "Anonymous";

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

// IMPORTANT: register only after connect
socket.on("connect", () => {
  console.log("🔌 Connected to server");

  socket.emit("register", username);
});

// =========================
// 💬 OPEN CHAT
// =========================
function openChat(user) {
  currentChatUser = user;

  document.getElementById("chatBox").innerHTML = "";
  document.getElementById("chatTitle").innerText = "💬 Chat with " + user;

  console.log("💬 Chat opened with:", user);
}

// =========================
// 📤 SEND MESSAGE
// =========================
function sendMessage() {
  const input = document.getElementById("chatInput");
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
// 📩 RECEIVE MESSAGE (FIXED)
// =========================
socket.on("privateMessage", (data) => {
  if (data.from === currentChatUser) {
    addMessage(data.from, data.message);
  }
});

// =========================
// 🧾 ADD MESSAGE UI
// =========================
function addMessage(user, message) {
  const box = document.getElementById("chatBox");

  const div = document.createElement("div");
  div.className = "chat-msg";
  div.innerHTML = `<b>${user}:</b> ${message}`;

  box.appendChild(div);
}

// =========================
// 🟢 ONLINE USERS (REAL)
// =========================
let onlineUsers = [];

socket.on("onlineUsers", (users) => {
  onlineUsers = users;
  renderOnlineUsers();
});

function renderOnlineUsers() {
  const box = document.getElementById("onlineUsers");

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
});