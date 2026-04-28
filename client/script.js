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

// =========================
// 💬 MESSAGE RENDER (WHATSAPP STYLE)
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

  // auto scroll
  messages.scrollTop = messages.scrollHeight;
}

// =========================
// 📤 SEND MESSAGE
// =========================
function send() {
  const input = document.getElementById("msg");
  const text = input.value.trim();

  if (!text) return;

  const message = {
    user: username,
    text,
    status: "sent"
  };

  socket.emit("sendMessage", message);

  input.value = "";
}

// =========================
// 📥 RECEIVE MESSAGE
// =========================
socket.on("receiveMessage", (data) => {
  const type = data.user === username ? "sent" : "received";
  addMessage(data, type);
});

// =========================
// 📜 MESSAGE HISTORY
// =========================
socket.emit("loadMessages");

socket.on("messageHistory", (messages) => {
  const box = document.getElementById("messages");
  box.innerHTML = "";

  messages.forEach((msg) => {
    const type = msg.user === username ? "sent" : "received";
    addMessage(msg, type);
  });
});

// =========================
// ⌨️ TYPING SYSTEM
// =========================
const inputBox = document.getElementById("msg");

inputBox.addEventListener("input", () => {
  socket.emit("typing", username);

  clearTimeout(typingTimeout);

  typingTimeout = setTimeout(() => {
    socket.emit("stopTyping");
  }, 800);
});

// show typing
socket.on("showTyping", (name) => {
  let typingDiv = document.getElementById("typing");

  if (!typingDiv) {
    typingDiv = document.createElement("div");
    typingDiv.id = "typing";
    typingDiv.className = "typing";
    document.getElementById("messages").appendChild(typingDiv);
  }

  typingDiv.textContent = `${name} is typing...`;
});

// hide typing
socket.on("hideTyping", () => {
  const typingDiv = document.getElementById("typing");
  if (typingDiv) typingDiv.remove();
});

// =========================
// 🟢 ONLINE USERS (SIDEBAR)
// =========================
socket.on("updateOnlineUsers", (users) => {
  const onlineDiv = document.getElementById("onlineUsers");

  if (!onlineDiv) return;

  if (!users || users.length === 0) {
    onlineDiv.innerHTML = `<div class="user">🟢 No users online</div>`;
    return;
  }

  onlineDiv.innerHTML = users
    .map(u => `<div class="user">🟢 ${u}</div>`)
    .join("");
});