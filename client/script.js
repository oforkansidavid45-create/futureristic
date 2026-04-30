console.log("🔥 script loaded");

// ================= USER SYSTEM =================
let username = localStorage.getItem("fb_username");

if (!username || username === "null" || username === "undefined") {
  username = prompt("Enter your name:");

  if (!username || username.trim() === "") {
    username = "User" + Math.floor(Math.random() * 9999);
  }

  username = username.trim();
  localStorage.setItem("fb_username", username);
}

console.log("👤 Username:", username);

// ================= API + SOCKET =================
const API = "https://futureristic.onrender.com";
const socket = io(API);

let currentChatUser = null;

// ================= CONNECT =================
socket.on("connect", () => {
  console.log("🔌 connected");
  socket.emit("register", username);
});

// ================= OPEN CHAT =================
function openChat(user) {
  currentChatUser = user;

  const title = document.getElementById("chatTitle");
  const box = document.getElementById("chatBox");

  if (title) title.innerText = "Chat with " + user;
  if (box) box.innerHTML = "";

  console.log("💬 chatting with:", user);
}

// ================= SEND MESSAGE =================
function sendMessage() {
  const input = document.getElementById("chatInput");

  if (!input || !input.value.trim() || !currentChatUser) return;

  const message = input.value.trim();

  socket.emit("privateMessage", {
    from: username,
    to: currentChatUser,
    message
  });

  addMessage("You", message);
  input.value = "";
}

// ================= RECEIVE MESSAGE =================
socket.on("privateMessage", (data) => {
  if (!data || !data.from || !data.message) return;

  const { from, to, message } = data;

  if (!currentChatUser) return;

  // show only current chat OR self
  if (
    (from === currentChatUser && to === username) ||
    (from === username && to === currentChatUser)
  ) {
    addMessage(from, message);
  }
});

// ================= UI MESSAGE =================
function addMessage(user, msg) {
  const box = document.getElementById("chatBox");
  if (!box) return;

  const div = document.createElement("div");
  div.className = "chat-msg";
  div.innerHTML = `<b>${user}:</b> ${msg}`;

  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

// ================= ONLINE USERS =================
socket.on("onlineUsers", (users) => {
  const box = document.getElementById("onlineUsers");
  if (!box) return;

  box.innerHTML = users
    .filter(u => u && u !== username)
    .map(u => `<div onclick="openChat('${u}')">🟢 ${u}</div>`)
    .join("");
});