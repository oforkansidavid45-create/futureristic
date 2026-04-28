const socket = io("https://dave-whatsappmadeasy.onrender.com");

// =========================
// 👤 USERNAME
// =========================
let username = prompt("Enter your name:");

if (!username || username.trim() === "") {
  username = "Anonymous";
}

// join server
socket.emit("join", username);

// =========================
// 💬 ADD MESSAGE
// =========================
function addMessage(data, type) {
  const div = document.createElement("div");
  div.classList.add("message", type);

  let ticks = "";

  // show ticks only for your messages
  if (data.user === username) {
    if (data.status === "sent") ticks = " ✔";
    if (data.status === "delivered") ticks = " ✔✔";
    if (data.status === "read") ticks = " ✔✔ (blue)";
  }

  div.textContent = `${data.user}: ${data.text}${ticks}`;

  const messages = document.getElementById("messages");
  messages.appendChild(div);

  // auto scroll
  messages.scrollTop = messages.scrollHeight;
}

// =========================
// 📤 SEND MESSAGE
// =========================
function send() {
  const input = document.getElementById("msg");
  const msg = input.value.trim();

  if (!msg) return;

  const fullMessage = {
    user: username,
    text: msg,
    status: "sent"
  };

  socket.emit("sendMessage", fullMessage);

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
// 📜 LOAD HISTORY
// =========================
socket.emit("loadMessages");

socket.on("messageHistory", (messages) => {
  const box = document.getElementById("messages");
  box.innerHTML = "";

  messages.forEach((data) => {
    const type = data.user === username ? "sent" : "received";
    addMessage(data, type);
  });
});

// =========================
// ⌨️ TYPING SYSTEM
// =========================
let typingTimeout;

document.getElementById("msg").addEventListener("input", () => {
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
// 🟢 ONLINE USERS
// =========================
socket.on("updateOnlineUsers", (users) => {
  const onlineDiv = document.getElementById("onlineUsers");

  if (!onlineDiv) return;

  if (!users || users.length === 0) {
    onlineDiv.innerHTML = "🟢 No users online";
    return;
  }

  onlineDiv.innerHTML = `
    <b>🟢 Online</b><br>
    ${users.map(user => `• ${user}`).join("<br>")}
  `;
});