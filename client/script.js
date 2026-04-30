console.log("script loaded");

let username = localStorage.getItem("fb_username");

if (!username) {
  username = prompt("Enter your name:");

  if (!username) username = "User" + Math.floor(Math.random() * 999);

  username = username.trim();
  localStorage.setItem("fb_username", username);
}

const API = "https://futureristic.onrender.com";
const socket = io(API);

let currentChatUser = null;

socket.on("connect", () => {
  socket.emit("register", username);
});

// ================= CHAT =================
function openChat(user) {
  currentChatUser = user;
  document.getElementById("chatTitle").innerText = "Chat with " + user;
  document.getElementById("chatBox").innerHTML = "";
}

function sendMessage() {
  const input = document.getElementById("chatInput");

  if (!input.value || !currentChatUser) return;

  socket.emit("privateMessage", {
    from: username,
    to: currentChatUser,
    message: input.value
  });

  addMessage("You", input.value);
  input.value = "";
}

socket.on("privateMessage", (data) => {
  if (!data) return;

  if (data.from === currentChatUser) {
    addMessage(data.from, data.message);
  }
});

function addMessage(user, msg) {
  const box = document.getElementById("chatBox");

  const div = document.createElement("div");
  div.innerHTML = `<b>${user}:</b> ${msg}`;

  box.appendChild(div);
}

socket.on("onlineUsers", (users) => {
  const box = document.getElementById("onlineUsers");

  box.innerHTML = users
    .filter(u => u !== username)
    .map(u => `<div onclick="openChat('${u}')">🟢 ${u}</div>`)
    .join("");
});