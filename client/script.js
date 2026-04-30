console.log("🔥 script loaded");

// ================= GLOBAL =================
let username = null;
let currentChatUser = null;

// unique tab id (for multi-tab chat fix)
const TAB_ID = Math.random().toString(36).substring(2);

// ================= CLEAN NAME =================
function cleanName(name) {
  if (!name) return "";
  return name.split("_")[0];
}

// ================= API + SOCKET =================
const API = "https://futureristic.onrender.com";
const socket = io(API);

// ================= AUTH SYSTEM =================
function signup() {
  const name = document.getElementById("nameInput").value.trim();
  const pass = document.getElementById("passwordInput").value;

  if (!name || !pass) return alert("Fill all fields");

  localStorage.setItem("fb_user", JSON.stringify({ name, pass }));

  alert("Account created! Now login.");
}

function login() {
  const name = document.getElementById("nameInput").value.trim();
  const pass = document.getElementById("passwordInput").value;

  const saved = JSON.parse(localStorage.getItem("fb_user"));

  if (!saved) return alert("No account found");

  if (saved.name === name && saved.pass === pass) {
    username = name + "_" + TAB_ID;

    // hide login, show app
    document.getElementById("authScreen").style.display = "none";
    document.querySelector(".app").style.display = "flex";

    console.log("👤 Logged in as:", username);

    socket.emit("register", username);
    loadPosts();
  } else {
    alert("Wrong login details");
  }
}

// ================= SOCKET CONNECT =================
socket.on("connect", () => {
  console.log("🔌 connected:", socket.id);
});

// ================= CREATE POST =================
async function createPost() {
  const input = document.getElementById("postInput");
  if (!input) return;

  if (!username) return alert("Login first!");

  const text = input.value.trim();
  if (!text) return alert("Write something!");

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

  if (!username) return alert("Login first!");
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

// ================= ADD MESSAGE =================
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
      return `<div class="online-user" onclick="openChat('${u}')">🟢 ${clean}</div>`;
    })
    .join("");
});

// ================= AUTO LOGIN (OPTIONAL NICE TOUCH) =================
window.addEventListener("DOMContentLoaded", () => {
  const saved = JSON.parse(localStorage.getItem("fb_user"));

  if (saved) {
    // auto fill inputs
    document.getElementById("nameInput").value = saved.name;
    document.getElementById("passwordInput").value = saved.pass;
  }
});