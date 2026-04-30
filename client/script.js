console.log("🔥 script.js loaded");

// =========================
// 👤 USER (FORCE FIX)
// =========================
function getUsername() {
  let name = localStorage.getItem("fb_username");

  if (!name || name === "null" || name === "undefined") {
    name = prompt("Enter your name:");

    if (!name || name.trim() === "") {
      name = "User" + Math.floor(Math.random() * 1000);
    }

    name = name.trim();
    localStorage.setItem("fb_username", name);
  }

  return name;
}

const username = getUsername();
console.log("👤 Username:", username);

// =========================
// 🌐 API
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
  console.log("🔌 Connected:", socket.id);

  socket.emit("register", username);
});

// =========================
// OPEN CHAT
// =========================
function openChat(user) {
  currentChatUser = user;

  const box = document.getElementById("chatBox");
  const title = document.getElementById("chatTitle");

  if (box) box.innerHTML = "";
  if (title) title.innerText = "💬 Chat with " + user;

  console.log("💬 Chat opened:", user);
}

// =========================
// SEND MESSAGE
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
// RECEIVE MESSAGE (FIXED)
// =========================
socket.on("privateMessage", (data) => {
  if (!data || !data.from || !data.message) return;

  // show ONLY if it's the active chat
  if (
    (data.from === currentChatUser && data.to === username) ||
    (data.from === username && data.to === currentChatUser)
  ) {
    addMessage(data.from, data.message);
  }
});

// =========================
// UI MESSAGE
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
// ONLINE USERS
// =========================
socket.on("onlineUsers", (users) => {
  renderOnlineUsers(users || []);
});

function renderOnlineUsers(users) {
  const box = document.getElementById("onlineUsers");
  if (!box) return;

  box.innerHTML = users
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
  console.log("🚀 UI ready");
});