console.log("🔥 script loaded");
const TAB_ID = Math.random().toString(36).substring(2);

// ================= GLOBAL =================
let username = null;
let currentChatUser = null;
let typingTimeout = null;

// ================= CLEAN NAME =================
function cleanName(name) {
  if (!name) return "";
  return name.split("_")[0];
}

// ================= API + SOCKET =================
const API = "https://futureristic.onrender.com";
const socket = io(API);

// ================= SAFE GET INPUT =================
function getVal(id) {
  const el = document.getElementById(id);
  return el ? el.value : "";
}

// ================= AUTH =================
function signup() {
  const name = getVal("nameInput").trim();
  const pass = getVal("passwordInput");

  if (!name || !pass) return alert("Fill all fields");

  localStorage.setItem("fb_user", JSON.stringify({ name, pass }));
  alert("Account created! Now login.");
}

function login() {
  const name = getVal("nameInput").trim();
  const pass = getVal("passwordInput");

  const saved = JSON.parse(localStorage.getItem("fb_user"));
  if (!saved) return alert("No account found");

  if (saved.name === name && saved.pass === pass) {
    username = name + "_" + TAB_ID;

    document.getElementById("authScreen").style.display = "none";
    document.querySelector(".app").style.display = "flex";

    console.log("👤 Logged in as:", username);

    socket.emit("register", username);
    loadPosts();
  } else {
    alert("Wrong login details");
  }
}

// ================= SOCKET =================
socket.on("connect", () => {
  console.log("🔌 connected:", socket.id);

  if (username) socket.emit("register", username);
});

// ================= CHAT =================
function openChat(user) {
  currentChatUser = user;

  document.getElementById("chatTitle").innerText =
    "Chat with " + cleanName(user);

  document.getElementById("chatBox").innerHTML = "";

  socket.emit("seen", { from: username, to: user });

  if (window.innerWidth <= 768) {
    document.getElementById("chatPanel").classList.add("active");
  }
}

// ================= MESSAGE =================
function addMessage(user, msg, status = "") {
  const box = document.getElementById("chatBox");
  if (!box) return;

  const div = document.createElement("div");
  div.className = "chat-msg";

  const isMe = user === "You";

  div.innerHTML = `
    <b>${user}:</b> ${msg}
    ${isMe ? `<span class="msg-status">${status}</span>` : ""}
  `;

  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

// ================= FIXED LAST MESSAGE UPDATE =================
function updateLastMyMessage(status, color) {
  const msgs = document.querySelectorAll(".my-msg .msg-status");
  if (!msgs.length) return;

  const last = msgs[msgs.length - 1];
  last.innerText = status;
  last.style.color = color;
}

// ================= SEND =================
function sendMessage() {
  if (!username || !currentChatUser) return;

  const input = document.getElementById("chatInput");
  const message = input.value.trim();
  if (!message) return;

  socket.emit("privateMessage", {
    from: username,
    to: currentChatUser,
    message
  });

  socket.emit("stopTyping", {
    from: username,
    to: currentChatUser
  });

  addMessage("You", message, "✔");

  input.value = "";
}

// ================= RECEIVE =================
socket.on("privateMessage", (data) => {
  if (!data) return;

  const from = cleanName(data.from);
  const to = cleanName(currentChatUser);

  // show notification if not open chat
  if (!currentChatUser || from !== to) {
    showNotification(data.from, data.message);
  }

  if (currentChatUser && from === to) {
    addMessage(from, data.message);

    socket.emit("delivered", {
      from: data.from,
      to: username
    });
  }
});

// ================= NOTIFICATION =================
function showNotification(sender, message) {
  const notif = document.createElement("div");
  notif.className = "notif-popup";
  notif.innerHTML = `<b>${cleanName(sender)}</b><br>${message}`;

  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 4000);
}

// ================= STATUS =================
socket.on("delivered", () => {
  updateLastMyMessage("✔✔", "gray");
});

socket.on("seen", () => {
  updateLastMyMessage("✔✔", "#00e5ff");
});

// ================= ONLINE USERS =================
socket.on("onlineUsers", (users) => {
  const box = document.getElementById("onlineUsers");
  if (!box) return;

  box.innerHTML = users
    .filter(u => u && u !== username)
    .map(u => `
      <div class="online-user" onclick="openChat('${u}')">
        🟢 ${cleanName(u)}
      </div>
    `).join("");
});

// ================= TYPING (FIXED LOGIC) =================
function handleTyping() {
  if (!username || !currentChatUser) return;

  socket.emit("typing", {
    from: username,
    to: currentChatUser
  });

  clearTimeout(typingTimeout);

  typingTimeout = setTimeout(() => {
    socket.emit("stopTyping", {
      from: username,
      to: currentChatUser
    });
  }, 800);
}

// ================= FIXED TYPING DISPLAY =================
socket.on("typing", (data) => {
  if (!currentChatUser) return;

  const bubble = document.getElementById("typingIndicator");
  if (!bubble) return;

  // 🔥 FIX: do NOT rely too strictly on full name match
  if (cleanName(data.from)) {
    bubble.style.display = "block";
    bubble.innerText = `${cleanName(data.from)} is typing...`;
  }
});

socket.on("stopTyping", () => {
  const bubble = document.getElementById("typingIndicator");
  if (bubble) bubble.style.display = "none";
});

// ================= AUTO LOGIN =================
window.addEventListener("DOMContentLoaded", () => {
  const saved = JSON.parse(localStorage.getItem("fb_user"));

  if (saved) {
    document.getElementById("nameInput").value = saved.name;
    document.getElementById("passwordInput").value = saved.pass;
  }
});

// ================= UI HELPERS =================
function showFeed() {
  document.querySelector(".feed").style.display = "block";
}

function logout() {
  localStorage.removeItem("fb_user");
  location.reload();
}

function toggleChat() {
  const panel = document.getElementById("chatPanel");
  if (panel) panel.classList.toggle("active");
}