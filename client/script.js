console.log("🔥 script loaded");

// ================= GLOBAL =================
let username = null;
let currentChatUser = null;
let typingTimeout = null;
let mediaRecorder;
let audioChunks = [];
let isRecording = false;

// ================= CLEAN NAME =================
function cleanName(name) {
  if (!name) return "";
  return name.toLowerCase().split("_")[0].trim();
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
  const name = getVal("nameInput").trim().toLowerCase();
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

    alert("Account created! Now login.");

  } catch (err) {
    console.log("❌ SIGNUP ERROR:", err);
    alert("Server error");
  }
}
async function login() {
  const name = getVal("nameInput").trim().toLowerCase();
  const pass = getVal("passwordInput");

  const res = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: name, password: pass })
  });

  const data = await res.json();

  if (data.error) return alert(data.error);

  username = data.user;

  document.getElementById("authScreen").style.display = "none";
  document.querySelector(".app").style.display = "flex";

  socket.emit("register", username);
  loadPosts();
}
// ================= USER STATUS =================
socket.on("userStatus", (data) => {
  console.log(data.user + " is " + data.status);
});

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

  const box = document.getElementById("chatBox");
  if (!box) return;

  box.innerHTML = `
    <div id="messagesContainer"></div>
    <div id="typingIndicator" class="typing-bubble"></div>
  `;

  // ✅ THIS IS CORRECT PLACE FOR SEEN
  socket.emit("seen", {
    from: username,
    to: currentChatUser
  });

  loadMessages(currentChatUser);
}
// ================= LOAD MESSAGES =================
async function loadMessages(user) {
  try {
    const res = await fetch(
      `${API}/api/messages/${cleanName(username)}/${cleanName(user)}`
    );

    const messages = await res.json();
    const msgBox = document.getElementById("messagesContainer");
    if (!msgBox) return;

    msgBox.innerHTML = "";

    messages.forEach(m => {
      addMessage(
        m.from === cleanName(username) ? "You" : m.from,
        m.message
      );
    });

  } catch (err) {
    console.log("❌ loadMessages error:", err);
  }
}

// ================= MESSAGE UI =================

function addMessage(user, msg, status = "") {
  const box = document.getElementById("messagesContainer");
  if (!box) return;

  const isMe = user === "You";

  const div = document.createElement("div");
  div.className = isMe ? "msg me" : "msg other";

  div.innerHTML = `
    <div class="msg-bubble">
      <div>${msg}</div>
      <div class="msg-meta">
        <span>${new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
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

  // ✅ show instantly
  addMessage("You", message, "✔");

  socket.emit("privateMessage", {
    from: username,
    to: currentChatUser,
    message
  });

  input.value = "";
}
// ================= RECEIVE MESSAGE =================

// ====// ================= RECEIVE MESSAGE =================
socket.on("privateMessage", (data) => {
  console.log("📩 RECEIVED:", data);

  if (!data) return;

  const from = cleanName(data.from || "");
  const me = cleanName(username || "");
  const current = cleanName(currentChatUser || "");

  const isMyMessage = from === me;

  // ❌ IMPORTANT: STOP DUPLICATE
  if (isMyMessage) return;

  // ✅ only show if chat open
  if (current !== from) return;

  if (data.audio) {
    addVoiceMessage(from, data.audio);
  } else {
    addMessage(from, data.message);
  }

  // delivery
  socket.emit("delivered", {
    from,
    to: me
  });
});
// ================= SEEN (ONLY WHEN CHAT IS OPEN) =================
function markSeen() {
  if (!currentChatUser) return;

  socket.emit("seen", {
    from: username,
    to: currentChatUser
  });
}
//============= ONLINE USERS =================
socket.on("onlineUsers", (users) => {
  if (!username) return;

  const container = document.getElementById("onlineUsers");
  if (!container) return;

  container.innerHTML =
    users
      .filter(u => u && cleanName(u) !== cleanName(username))
      .map(u => `
        <div class="online-user" onclick="openChat('${u}')">
          🟢 ${cleanName(u)}
        </div>
      `)
      .join("");
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

socket.on("typing", (data) => {
  if (!currentChatUser) return;

  if (cleanName(data.from) !== cleanName(currentChatUser)) return;

  const bubble = document.getElementById("typingIndicator");

  if (bubble) {
    bubble.style.display = "block";
    bubble.innerText = cleanName(data.from) + " is typing...";
  }
});

socket.on("stopTyping", (data) => {
  if (!currentChatUser) return;

  if (cleanName(data.from) !== cleanName(currentChatUser)) return;

  const bubble = document.getElementById("typingIndicator");

  if (bubble) {
    bubble.style.display = "none";
    bubble.innerText = "";
  }
});
socket.on("messageSeen", (data) => {
  document.querySelectorAll(".msg-status").forEach(el => {
    el.innerText = "✔✔";
    el.style.color = "cyan";
  });
});

// ================= POSTS =================
async function loadPosts() {
  const res = await fetch(`${API}/api/posts`);
  const posts = await res.json();

  const container = document.getElementById("posts");
  if (!container) return;

  container.innerHTML = "";

  posts.forEach(post => {
    const div = document.createElement("div");
    div.className = "post";

    div.innerHTML = `
      <b>${post.user}</b>
      <p>${post.text}</p>
      <button onclick="likePost('${post._id}')">❤️ ${post.likes}</button>
    `;

    container.appendChild(div);
  });
}

async function createPost() {
  const input = document.getElementById("postInput");
  if (!input) return;

  const text = input.value.trim();
  if (!text || !username) return;

  await fetch(`${API}/api/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user: cleanName(username),
      text
    })
  });

  input.value = "";
  loadPosts();
}

async function likePost(id) {
  await fetch(`${API}/api/posts/like/${id}`, { method: "PUT" });
  loadPosts();
}

// ================= MOBILE =================
function toggleChat() {
  const panel = document.getElementById("chatPanel");
  if (panel) panel.classList.toggle("active");
}

function showFeed() {
  const panel = document.getElementById("chatPanel");
  if (panel) panel.classList.remove("active");
}

function logout() {
  localStorage.removeItem("fb_user");
  location.reload();
}