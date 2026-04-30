console.log("🔥 script loaded");

// ================= TAB ID (IMPORTANT FIX) =================
const TAB_ID = Math.random().toString(36).substring(2);

// ================= USER SYSTEM =================
function getUsername() {
  let name = localStorage.getItem("fb_username");

  if (!name || name === "null" || name === "undefined") {
    name = prompt("Enter your name:");

    if (!name || name.trim() === "") {
      name = "User" + Math.floor(Math.random() * 9999);
    }

    name = name.trim();
    localStorage.setItem("fb_username", name);
  }

  return name;
}

const baseUsername = getUsername();
const username = baseUsername + "_" + TAB_ID;

console.log("👤 Username:", username);

// ================= CLEAN NAME =================
function cleanName(name) {
  if (!name) return "";
  return name.split("_")[0];
}

// ================= API + SOCKET =================
const API = "https://futureristic.onrender.com";
const socket = io(API);

let currentChatUser = null;

// ================= CONNECT =================
socket.on("connect", () => {
  console.log("🔌 connected");

  socket.emit("register", username);

  loadPosts();
});

// ================= CREATE POST =================
async function createPost() {
  const input = document.getElementById("postInput");
  if (!input) return;

  const text = input.value.trim();
  if (!text) return alert("Write something first!");

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

// ================= LOAD POSTS =================
async function loadPosts() {
  const res = await fetch(`${API}/api/posts`);
  const posts = await res.json();

  const box = document.getElementById("posts");
  if (!box) return;

  box.innerHTML = posts
    .map(p => `
      <div class="post">
        <b>${p.user}</b>
        <p>${p.text}</p>
        <small>❤️ ${p.likes || 0}</small>
      </div>
    `)
    .join("");
}

// ================= OPEN CHAT =================
function openChat(user) {
  currentChatUser = user;

  const title = document.getElementById("chatTitle");
  const box = document.getElementById("chatBox");

  if (title) title.innerText = "Chat with " + cleanName(user);
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

  if (!currentChatUser) return;

  const fromClean = cleanName(data.from);
  const toClean = cleanName(data.to);
  const activeUser = cleanName(currentChatUser);

  if (fromClean === activeUser || toClean === activeUser) {
    addMessage(fromClean, data.message);
  }
});

// ================= ADD MESSAGE UI =================
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
    .map(u => {
      const clean = cleanName(u);
      return `<div onclick="openChat('${u}')">🟢 ${clean}</div>`;
    })
    .join("");
});

// ================= INIT =================
window.addEventListener("DOMContentLoaded", () => {
  loadPosts();
});