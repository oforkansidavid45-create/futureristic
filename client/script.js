console.log("🔥 script.js loaded");

// =========================
// 👤 USER (SAFE FIXED)
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

// =========================
// CONNECT + REGISTER
// =========================
socket.on("connect", () => {
  console.log("🔌 Connected to server");
  socket.emit("register", username);
});

// =========================
// 💬 OPEN CHAT
// =========================
function openChat(user) {
  currentChatUser = user;

  const box = document.getElementById("chatBox");
  const title = document.getElementById("chatTitle");

  if (box) box.innerHTML = "";
  if (title) title.innerText = "💬 Chat with " + user;

  console.log("💬 Chat opened with:", user);

  // ask server for chat history (if backend supports it later)
  socket.emit("openChat", {
    from: username,
    to: user
  });
}

// =========================
// 📤 SEND MESSAGE
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
// 📩 RECEIVE MESSAGE (FIXED)
// =========================
socket.on("privateMessage", (data) => {
  if (!data || !data.from) return;

  // show only current chat OR if you're the receiver
  if (data.from === currentChatUser || data.to === username) {
    addMessage(data.from, data.message);
  }
});

// =========================
// 🧾 ADD MESSAGE UI (SAFE)
// =========================
function addMessage(user, message) {
  const box = document.getElementById("chatBox");
  if (!box) return;

  const div = document.createElement("div");
  div.className = "chat-msg";
  div.innerHTML = `<b>${user}:</b> ${message}`;

  box.appendChild(div);

  box.scrollTop = box.scrollHeight;
}

// =========================
// ⌨️ TYPING INDICATOR (CLIENT SIDE)
// =========================
const chatInput = document.getElementById("chatInput");

if (chatInput) {
  chatInput.addEventListener("input", () => {
    if (!currentChatUser) return;

    socket.emit("typing", {
      from: username,
      to: currentChatUser
    });
  });
}

// =========================
// 🟢 ONLINE USERS
// =========================
let onlineUsers = [];

socket.on("onlineUsers", (users) => {
  onlineUsers = users || [];
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
});