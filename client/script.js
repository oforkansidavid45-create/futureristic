console.log("🔥 script loaded");
const TAB_ID = Math.random().toString(36).substring(2);

// ================= GLOBAL =================
let username = null;
let currentChatUser = null;

// ================= CLEAN NAME =================
function cleanName(name) {
  if (!name) return "";
  return name.split("_")[0];
}

// ================= API + SOCKET =================
const API = "https://futureristic.onrender.com";
const socket = io(API);

// ================= AUTH =================
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

  // 🔥 re-register after reconnect
  if (username) {
    socket.emit("register", username);
  }
});

// ================= CREATE POST =================
async function createPost() {
  if (!username) return alert("Login first!");

  const input = document.getElementById("postInput");
  if (!input) return;

  const text = input.value.trim();
  if (!text) return alert("Write something!");

  await fetch(`${API}/api/posts`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
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
  try {
    const res = await fetch(`${API}/api/posts`);
    const posts = await res.json();

    const box = document.getElementById("posts");
    if (!box) return;

    box.innerHTML = posts.map(p => `
      <div class="post">
        <b>${p.user}</b>
        <p>${p.text}</p>

        <div>
          ❤️ ${p.likes || 0}
          <button onclick="likePost('${p._id}')">Like</button>
        </div>

        <div class="comments">
          ${(p.comments || []).map(c => `
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

  } catch (err) {
    console.log("❌ loadPosts error:", err);
  }
}

// ================= LIKE =================
async function likePost(id) {
  try {
    await fetch(`${API}/api/posts/like/${id}`, {
      method: "PUT"
    });
    loadPosts();
  } catch (err) {
    console.log("❌ like error:", err);
  }
}

// ================= COMMENT =================
async function addComment(id) {
  if (!username) return alert("Login first!");

  const input = document.getElementById(`c-${id}`);
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  try {
    await fetch(`${API}/api/posts/comment/${id}`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        user: cleanName(username),
        text
      })
    });

    input.value = "";
    loadPosts();
  } catch (err) {
    console.log("❌ comment error:", err);
  }
}

// ================= CHAT =================
function openChat(user) {
  currentChatUser = user;

  const title = document.getElementById("chatTitle");
  const box = document.getElementById("chatBox");
  const rightbar = document.querySelector(".rightbar");

  if (title) title.innerText = "Chat with " + cleanName(user);
  if (box) box.innerHTML = "";

  if (window.innerWidth <= 768 && rightbar) {
    rightbar.classList.add("active");
  }
}

function closeChat() {
  const rightbar = document.querySelector(".rightbar");
  if (rightbar) rightbar.classList.remove("active");
}

// ================= SEND MESSAGE =================
function sendMessage() {
  if (!username) return alert("Login first!");

  const input = document.getElementById("chatInput");
  if (!input) return;

  const message = input.value.trim();
  if (!message || !currentChatUser) return;

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
  if (!data || !currentChatUser) return;

  const fromClean = cleanName(data.from);
  const activeUser = cleanName(currentChatUser);

  if (fromClean === activeUser) {
    addMessage(fromClean, data.message);
  }
});

// ================= UI MESSAGE =================
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
  console.log("ONLINE USERS FROM SERVER:", users);

  const box = document.getElementById("onlineUsers");
  if (!box) return;

  box.innerHTML = users
    .filter(u => u && u !== username)
    .map(u => `
      <div class="online-user" onclick="openChat('${u}')">
        🟢 ${u.split("_")[0]}
      </div>
    `)
    .join("");
});

// ================= TYPING INDICATOR (NEW) =================

// SEND typing
document.addEventListener("DOMContentLoaded", () => {
  const chatInput = document.getElementById("chatInput");

  if (chatInput) {
    chatInput.addEventListener("input", () => {
      if (currentChatUser) {
        socket.emit("typing", {
          from: username,
          to: currentChatUser
        });
      }
    });
  }
});

// RECEIVE typing
socket.on("typing", (data) => {
  if (!currentChatUser) return;

  if (cleanName(data.from) === cleanName(currentChatUser)) {
    const title = document.getElementById("chatTitle");
    if (title) {
      title.innerText = cleanName(data.from) + " is typing...";
    }
  }
});

// ================= AUTO-FILL LOGIN =================
window.addEventListener("DOMContentLoaded", () => {
  const saved = JSON.parse(localStorage.getItem("fb_user"));

  if (saved) {
    document.getElementById("nameInput").value = saved.name;
    document.getElementById("passwordInput").value = saved.pass;
  }
});