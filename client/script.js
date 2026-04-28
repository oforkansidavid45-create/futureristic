const socket = io("https://dave-whatsappmadeasy.onrender.com");

// =========================
// 👤 USER
// =========================
let username = prompt("Enter your name:");

if (!username || username.trim() === "") {
  username = "Anonymous";
}

socket.emit("join", username);

// =========================
// 📍 STATE
// =========================
let typingTimeout = null;
let currentChatUser = null;
let currentRoom = null;

// =========================
// 🧠 ROOM HELPER
// =========================
function getRoomId(user1, user2) {
  return [user1, user2].sort().join("-");
}

// =========================
// 💬 MESSAGE RENDER
// =========================
function addMessage(data, type) {
  const messages = document.getElementById("messages");

  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message", type);

  const bubble = document.createElement("div");
  bubble.classList.add("bubble");

  let ticks = "";

  if (data.user === username) {
    if (data.status === "sent") ticks = " ✔";
    if (data.status === "delivered") ticks = " ✔✔";
    if (data.status === "read") ticks = " ✔✔";
  }

  bubble.innerHTML = `
    <span class="text">${data.text}</span>
    <span class="meta">${data.user} ${ticks}</span>
  `;

  msgDiv.appendChild(bubble);
  messages.appendChild(msgDiv);

  messages.scrollTop = messages.scrollHeight;
}

// =========================
// 📂 OPEN CHAT
// =========================
function openChat(user) {
  currentChatUser = user;
  currentRoom = getRoomId(username, user);

  // join room
  socket.emit("joinRoom", currentRoom);

  // clear messages
  const box = document.getElementById("messages");
  box.innerHTML = "";

  // update header
  document.querySelector(".chat-header").textContent = "Chat with " + user;

  // load messages
  socket.emit("loadRoomMessages", currentRoom);
}

// =========================
// 📜 LOAD CHAT HISTORY
// =========================
socket.on("roomMessages", (messages) => {
  const box = document.getElementById("messages");
  box.innerHTML = "";

  messages.forEach((msg) => {
    const type = msg.user === username ? "sent" : "received";
    addMessage(msg, type);
  });
});

// =========================
// 📤 SEND MESSAGE (FIXED)
// =========================
function send() {
  const input = document.getElementById("msg");
  const text = input.value.trim();

  if (!text) return;

  if (!currentChatUser) {
    alert("Click a user to start chat");
    return;
  }

  // 🔥 INSTANT UI (like WhatsApp)
  addMessage({
    user: username,
    text,
    status: "sent"
  }, "sent");

  socket.emit("sendPrivateMessage", {
    from: username,
    to: currentChatUser,
    text
  });

  input.value = "";
}

// =========================
// 📥 RECEIVE MESSAGE (FIXED)
// =========================
socket.on("receivePrivateMessage", (data) => {
  // ❗ only show if in current chat
  if (!currentRoom || data.roomId !== currentRoom) return;

  const type = data.user === username ? "sent" : "received";
  addMessage(data, type);
});

// =========================
// ⌨️ TYPING
// =========================
const inputBox = document.getElementById("msg");

inputBox.addEventListener("input", () => {
  if (!currentChatUser) return;

  socket.emit("typing", username);

  clearTimeout(typingTimeout);

  typingTimeout = setTimeout(() => {
    socket.emit("stopTyping");
  }, 800);
});

// =========================
// SHOW TYPING
// =========================
socket.on("showTyping", (name) => {
  if (name === username) return;

  let typingDiv = document.getElementById("typing");

  if (!typingDiv) {
    typingDiv = document.createElement("div");
    typingDiv.id = "typing";
    typingDiv.className = "typing";
    document.getElementById("messages").appendChild(typingDiv);
  }

  typingDiv.textContent = `${name} is typing...`;
});

// =========================
// HIDE TYPING
// =========================
socket.on("hideTyping", () => {
  const typingDiv = document.getElementById("typing");
  if (typingDiv) typingDiv.remove();
});

// =========================
// 🟢 ONLINE USERS (CLICKABLE)
// =========================
socket.on("updateOnlineUsers", (users) => {
  const onlineDiv = document.getElementById("onlineUsers");

  if (!onlineDiv) return;

  if (!users || users.length === 0) {
    onlineDiv.innerHTML = `<div class="user">🟢 No users online</div>`;
    return;
  }

  onlineDiv.innerHTML = users
    .filter(u => u !== username)
    .map(u => `<div class="user" onclick="openChat('${u}')">🟢 ${u}</div>`)
    .join("");
});