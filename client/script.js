console.log("🔥 script loaded");

// ================= GLOBAL =================
let username = null;
let currentChatUser = null;
let typingTimeout = null;
let mediaRecorder;
let audioChunks = [];
let isRecording = false;

// ================= CLEAN NAME (FIXED - MUST MATCH BACKEND) =================
function cleanName(name) {
  if (!name) return "";
  return name.toString().trim().toLowerCase().replace(/\s+/g, "");
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
}

// ================= SOCKET CONNECT =================
socket.on("connect", () => {
  console.log("✅ CONNECTED:", socket.id);
  if (username) socket.emit("register", username);
});

// ================= CHAT OPEN =================
function openChat(user) {
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

// ================= LOAD MESSAGES =================
async function loadMessages(user) {
  const res = await fetch(
    `${API}/api/messages/${cleanName(username)}/${cleanName(user)}`
  );

  const messages = await res.json();
  const box = document.getElementById("messagesContainer");

  box.innerHTML = "";

  messages.forEach(m => {
    if (m.message) addMessage(m.from, m.message);
    if (m.audio) addVoiceMessage(m.from, m.audio);
    if (m.image) addImageMessage(m.from, m.image);
    if (m.file) addFileMessage(m.from, m.file);
  });
}

// ================= MESSAGE UI =================
function addMessage(user, msg, status = "") {
  const box = document.getElementById("messagesContainer");

  const isMe = cleanName(user) === cleanName(username);

  const div = document.createElement("div");
  div.className = `msg ${isMe ? "me" : "other"}`;

  div.innerHTML = `
    <div class="bubble">
      <div>${msg}</div>
      <div class="meta">
        <span>${new Date().toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})}</span>
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
  const message = input.value.trim();

  if (!message || !currentChatUser) return;

  socket.emit("privateMessage", {
    from: username,
    to: currentChatUser,
    message
  });

  input.value = "";
}

// ================= RECEIVE MESSAGE (FIXED DUPLICATION BUG) =================
socket.on("privateMessage", (data) => {

  console.log("📩 RECEIVED:", data);

  if (!data) return;

  const from = cleanName(data.from || "");
  const me = cleanName(username || "");

  const isMe = from === me;

  // 🔥 DON'T DUPLICATE MY OWN TEXT
  if (isMe && data.message) {
    return;
  }

  const sender = isMe ? "You" : from;

  // TEXT
  if (data.message) {
    addMessage(sender, data.message);
  }

  // VOICE
  if (data.audio) {
    addVoiceMessage(sender, data.audio);
  }

  // IMAGE
  if (data.image) {
    addImageMessage(sender, data.image);
  }

  // FILE
  if (data.file) {
    addFileMessage(sender, data.file);
  }

});

// ================= ONLINE USERS =================
socket.on("onlineUsers", (users) => {
  const container = document.getElementById("onlineUsers");

  container.innerHTML = users
    .filter(u => cleanName(u) !== cleanName(username))
    .map(u => `
      <div class="online-user" onclick="openChat('${u}')">
        🟢 ${u}
      </div>
    `).join("");
});

// ================= TYPING =================
function handleTyping() {
  if (!currentChatUser) return;

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
      <img src="${src}" class="chat-image">
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

// ================= FILE SEND =================
function sendFile() {
  const file = document.getElementById("fileInput").files[0];
  if (!file || !currentChatUser) return;

  const reader = new FileReader();

  reader.onload = () => {
    socket.emit("privateMessage", {
      from: username,
      to: currentChatUser,
      file: {
        name: file.name,
        type: file.type,
        data: reader.result
      }
    });
  };

  reader.readAsDataURL(file);
}