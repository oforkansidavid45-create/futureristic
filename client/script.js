let currentProfileUser = null;

function showToast(message) {
  let toast = document.getElementById("toast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    document.body.appendChild(toast);
  }

  toast.innerText = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("UI READY");
});

console.log("🔥 script loaded");

// ================= API + SOCKET =================
const API = "https://futureristic.onrender.com";
const socket = io(API);

window.onerror = function (msg, url, line) {
  console.log("❌ GLOBAL ERROR:", msg, "LINE:", line);
};

// ================= GLOBAL =================
let username = null;
let currentChatUser = null;
let typingTimeout = null;
let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let friendsList = [];

// ================= CLEAN NAME =================
function cleanName(name) {
  if (!name) return "";
  return name.toString().trim().toLowerCase().replace(/\s+/g, "");
}

// ================= SAFE GET =================
function getVal(id) {
  const el = document.getElementById(id);
  return el ? el.value : "";
}

// ================= AUTH =================
async function signup() {
  const name = cleanName(getVal("nameInput"));
  const pass = getVal("passwordInput");

  if (!name || !pass) return alert("Fill all fields");

  try {
    const res = await fetch(`${API}/api/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: name, password: pass })
    });

    const data = await res.json();
    if (data.error) return alert(data.error);

    alert("Account created! Now login");
  } catch (err) {
    console.log(err);
  }
}

async function login() {
  const name = cleanName(getVal("nameInput"));
  const pass = getVal("passwordInput");

  const res = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: name, password: pass })
  });

  const data = await res.json();
  if (data.error) return alert(data.error);

  username = cleanName(data.user);

  document.getElementById("authScreen").style.display = "none";
  document.querySelector(".app").style.display = "flex";

  socket.emit("register", username);

  loadPosts();

  const savedPic = localStorage.getItem("profilePic");
  if (savedPic) {
    document.getElementById("profilePreview").src = savedPic;
  }

  if (!window.notifInterval) {
    loadNotifications();
    window.notifInterval = setInterval(loadNotifications, 5000);
  }
}

// ================= SOCKET =================
socket.on("connect", () => {
  console.log("✅ CONNECTED:", socket.id);
  if (username) socket.emit("register", username);
});

// ================= CHAT OPEN (FIXED) =================
function openChat(user) {
  if (!friendsList.map(cleanName).includes(cleanName(user))) {
    alert("You are not friends yet");
    return;
  }

  currentChatUser = cleanName(user);

  document.getElementById("chatTitle").innerText =
    "Chat with " + currentChatUser;

  document.getElementById("messagesContainer").innerHTML = "";

  socket.emit("seen", {
    from: username,
    to: currentChatUser
  });

  loadMessages(currentChatUser);
}

// ================= LOAD MESSAGES (SAFE) =================
async function loadMessages(user) {
  const res = await fetch(
    `${API}/api/messages/${cleanName(username)}/${cleanName(user)}`
  );

  const messages = await res.json();
  const box = document.getElementById("messagesContainer");

  box.innerHTML = "";

  messages.forEach(m => {
    if (!m) return;

    if (m.message) addMessage(m.from || "unknown", m.message);
    if (m.audio) addVoiceMessage(m.from || "unknown", m.audio);
    if (m.image) addImageMessage(m.from || "unknown", m.image);
    if (m.file) addFileMessage(m.from || "unknown", m.file);
  });
}

// ================= MESSAGE =================
function addMessage(user, msg, status = "") {
  const box = document.getElementById("messagesContainer");
  if (!box) return;

  const isMe = cleanName(user) === cleanName(username);

  const div = document.createElement("div");
  div.className = `msg ${isMe ? "me" : "other"}`;

  div.innerHTML = `
    <div class="bubble">
      <div>${msg}</div>
      <div class="meta">
        <span>${new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit"
        })}</span>
        ${isMe ? `<span class="msg-status">${status}</span>` : ""}
      </div>
    </div>
  `;

  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

// ================= SEND MESSAGE =================
function sendMessage() {
  const input = document.getElementById("chatInput");
  if (!input) return;

  const message = input.value.trim();
  if (!message || !currentChatUser) return;

  addMessage("You", message, "✔");

  socket.emit("privateMessage", {
    from: username,
    to: currentChatUser,
    message
  });

  input.value = "";
}

// ================= SOCKET RECEIVE =================
socket.on("privateMessage", (data) => {
  if (!data) return;

  const from = cleanName(data.from || "");
  const me = cleanName(username || "");

  if (from === me && data.message) return;

  const isMine = from === me;

  if (data.message) {
    addMessage(isMine ? "You" : from, data.message);
  }

  if (data.audio) addVoiceMessage(isMine ? "You" : from, data.audio);
  if (data.image) addImageMessage(isMine ? "You" : from, data.image);
  if (data.file) addFileMessage(isMine ? "You" : from, data.file);
});

// ================= VOICE =================
function addVoiceMessage(user, audioSrc) {
  const box = document.getElementById("messagesContainer");
  const isMe = cleanName(user) === cleanName(username);

  const div = document.createElement("div");
  div.className = `msg ${isMe ? "me" : "other"}`;

  div.innerHTML = `
    <div class="bubble">
      <audio controls src="${audioSrc}"></audio>
    </div>
  `;

  box.appendChild(div);
}

// ================= IMAGE =================
function addImageMessage(user, src) {
  const box = document.getElementById("messagesContainer");
  const isMe = cleanName(user) === cleanName(username);

  const div = document.createElement("div");
  div.className = `msg ${isMe ? "me" : "other"}`;

  div.innerHTML = `
    <div class="bubble">
      <img src="${src}" class="chat-image"
        onclick="openImageViewer('${src}')">
    </div>
  `;

  box.appendChild(div);
}

// ================= FILE =================
function addFileMessage(user, file) {
  const box = document.getElementById("messagesContainer");
  const isMe = cleanName(user) === cleanName(username);

  const div = document.createElement("div");
  div.className = `msg ${isMe ? "me" : "other"}`;

  div.innerHTML = `
    <div class="bubble">
      <a href="${file.data}" download>${file.name}</a>
    </div>
  `;

  box.appendChild(div);
}