const socket = io("https://dave-whatsappmadeasy.onrender.com");

// =========================
// USER
// =========================
let username = prompt("Enter your name:") || "Anonymous";
socket.emit("join", username);

// =========================
// STATE
// =========================
let currentChatUser = null;
let currentRoom = null;
let typingTimeout;

// =========================
// ROOM ID
// =========================
function getRoomId(a, b) {
  return [a, b].sort().join("-");
}

// =========================
// OPEN CHAT
// =========================
function openChat(user) {
  currentChatUser = user;
  currentRoom = getRoomId(username, user);

  document.getElementById("messages").innerHTML = "";
  document.querySelector(".chat-header").innerText = "Chat with " + user;

  socket.emit("joinRoom", currentRoom);
  socket.emit("loadRoomMessages", currentRoom);
}

// =========================
// RENDER MESSAGE (FIXED)
// =========================
function addMessage(data) {
  const box = document.getElementById("messages");

  const div = document.createElement("div");
  div.className = "message " + (data.user === username ? "sent" : "received");

  let ticks = "";

  if (data.user === username) {
    if (data.status === "sent") ticks = " ✔";
    if (data.status === "delivered") ticks = " ✔✔";
    if (data.status === "read") ticks = " ✔✔✔";
  }

  div.innerHTML = `
    <div class="bubble">
      <div class="text">${data.text}</div>
      <div class="meta">${ticks}</div>
    </div>
  `;

  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

// =========================
// SEND MESSAGE (FIXED)
// =========================
function send() {
  const input = document.getElementById("msg");
  const text = input.value.trim();

  if (!text || !currentChatUser) return;

  const messageData = {
    user: username,
    text,
    status: "sent",
    roomId: currentRoom
  };

  // 🔥 INSTANT UI (important)
  addMessage(messageData);

  socket.emit("sendPrivateMessage", {
    from: username,
    to: currentChatUser,
    text
  });

  input.value = "";
}

// =========================
// RECEIVE MESSAGE (FIXED)
// =========================
socket.on("receivePrivateMessage", (data) => {
  if (data.roomId !== currentRoom) return;
  addMessage(data);
});

// =========================
// LOAD HISTORY (FIXED)
// =========================
socket.on("roomMessages", (messages) => {
  const box = document.getElementById("messages");
  box.innerHTML = "";
  messages.forEach(addMessage);
});

// =========================
// TYPING (ROOM SAFE)
// =========================
document.getElementById("msg").addEventListener("input", () => {
  if (!currentChatUser) return;

  socket.emit("typing", username);

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit("stopTyping");
  }, 800);
});

// =========================
// ONLINE USERS
// =========================
socket.on("updateOnlineUsers", (users) => {
  const box = document.getElementById("onlineUsers");

  box.innerHTML = users
    .filter(u => u !== username)
    .map(u => `<div class="user" onclick="openChat('${u}')">${u}</div>`)
    .join("");
});

// =========================
// TYPING UI (FIXED SAFE)
// =========================
socket.on("showTyping", (name) => {
  const t = document.getElementById("typing");
  if (!t) return;

  if (name !== currentChatUser) return;

  t.innerText = `${name} is typing...`;
});

socket.on("hideTyping", () => {
  const t = document.getElementById("typing");
  if (t) t.innerText = "";
});