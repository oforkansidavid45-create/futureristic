console.log("🔥 script loaded");

// ================= TAB ID =================
const TAB_ID = Math.random().toString(36).substring(2);

// ================= USER =================
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

function cleanName(name) {
  return name.split("_")[0];
}

// ================= API =================
const API = "https://futureristic.onrender.com";
const socket = io(API);

let currentChatUser = null;

// ================= CONNECT =================
socket.on("connect", () => {
  socket.emit("register", username);
  loadPosts();
});

// ================= CREATE POST =================
async function createPost() {
  const input = document.getElementById("postInput");

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

  box.innerHTML = posts.map(p => `
    <div class="post">
      <b>${p.user}</b>
      <p>${p.text}</p>

      <div>
        ❤️ ${p.likes}
        <button onclick="likePost('${p._id}')">Like</button>
      </div>

      <div class="comments">
        ${p.comments.map(c => `
          <div class="comment">
            <b>${c.user}:</b> ${c.text}
          </div>
        `).join("")}
      </div>

      <div class="comment-box">
        <input id="c-${p._id}" placeholder="Write comment..." />
        <button onclick="addComment('${p._id}')">Send</button>
      </div>
    </div>
  `).join("");
}

// ================= LIKE =================
async function likePost(id) {
  await fetch(`${API}/api/posts/like/${id}`, {
    method: "PUT"
  });

  loadPosts();
}

// ================= COMMENT =================
async function addComment(id) {
  const input = document.getElementById(`c-${id}`);
  const text = input.value.trim();

  if (!text) return;

  await fetch(`${API}/api/posts/comment/${id}`, {
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

// ================= CHAT =================
function openChat(user) {
  currentChatUser = user;
  document.getElementById("chatTitle").innerText = "Chat with " + cleanName(user);
  document.getElementById("chatBox").innerHTML = "";
}

function sendMessage() {
  const input = document.getElementById("chatInput");

  if (!input.value.trim() || !currentChatUser) return;

  const message = input.value.trim();

  socket.emit("privateMessage", {
    from: username,
    to: currentChatUser,
    message
  });

  addMessage("You", message);
  input.value = "";
}

socket.on("privateMessage", (data) => {
  if (!data) return;

  const from = cleanName(data.from);

  if (cleanName(currentChatUser) === from) {
    addMessage(from, data.message);
  }
});

function addMessage(user, msg) {
  const box = document.getElementById("chatBox");

  const div = document.createElement("div");
  div.className = "chat-msg";
  div.innerHTML = `<b>${user}:</b> ${msg}`;

  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

// ================= ONLINE USERS =================
socket.on("onlineUsers", (users) => {
  const box = document.getElementById("onlineUsers");

  box.innerHTML = users
    .filter(u => u !== username)
    .map(u => `<div class="online-user" onclick="openChat('${u}')">🟢 ${cleanName(u)}</div>`)
    .join("");
});

// ================= INIT =================
window.onload = loadPosts;