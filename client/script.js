console.log("🔥 script loaded");
const TAB_ID = Math.random().toString(36).substring(2);

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

    socket.emit("register", username);

    loadPosts(); // ✅ ensure posts load
  } else {
    alert("Wrong login details");
  }
}

// ================= LOAD POSTS =================
async function loadPosts() {
  try {
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

  } catch (err) {
    console.log("❌ loadPosts error:", err);
  }
}

// ================= CREATE POST =================
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

// ================= LIKE POST =================
async function likePost(id) {
  await fetch(`${API}/api/posts/like/${id}`, { method: "PUT" });
  loadPosts();
}

// ================= SOCKET CONNECT =================
socket.on("connect", () => {
  if (username) socket.emit("register", username);
});

// ================= CHAT OPEN =================
function openChat(user) {
  currentChatUser = user;

  document.getElementById("chatTitle").innerText =
    "Chat with " + cleanName(user);

  const box = document.getElementById("chatBox");

  if (!box) return;

  box.innerHTML = `
    <div id="messagesContainer"></div>
    <div id="typingIndicator" class="typing-bubble"></div>
  `;

  socket.emit("seen", {
    from: username,
    to: user
  });

  if (window.innerWidth <= 768) {
    document.getElementById("chatPanel").classList.add("active");
  }

  loadMessages(user);
}

// ================= LOAD MESSAGES =================
async function loadMessages(user) {
  try {
    const res = await fetch(
      `${API}/api/messages/${cleanName(username)}/${cleanName(user)}`
    );

    const messages = await res.json();

    let msgBox = document.getElementById("messagesContainer");

    // ✅ auto-create if missing
    if (!msgBox) {
      const chatBox = document.getElementById("chatBox");
      if (!chatBox) return;

      chatBox.innerHTML = `
        <div id="messagesContainer"></div>
        <div id="typingIndicator" class="typing-bubble"></div>
      `;

      msgBox = document.getElementById("messagesContainer");
    }

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

  const div = document.createElement("div");
  div.className = "chat-msg";

  if (user === "You") div.classList.add("my-msg");

  div.innerHTML = `
    <b>${user}:</b> ${msg}
    ${user === "You" ? `<span class="msg-status">${status}</span>` : ""}
  `;

  box.appendChild(div);

  requestAnimationFrame(() => {
    div.style.animation = "msgPop 0.25s ease forwards";
  });

  box.scrollTop = box.scrollHeight;
}

// ================= SEND MESSAGE =================
function sendMessage() {
  const input = document.getElementById("chatInput");
  if (!input) return;

  const message = input.value.trim();
  if (!message || !currentChatUser) return;

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

// ================= RECEIVE MESSAGE =================
socket.on("privateMessage", (data) => {
  const fromClean = cleanName(data.from);

  if (data.audio) {
    addVoiceMessage(fromClean, data.audio);
    return;
  }

  // ✅ FIXED CONDITION
  if (currentChatUser) {
    addMessage(fromClean, data.message);

    socket.emit("delivered", {
      from: data.from,
      to: username
    });
  }
});

// ================= ONLINE USERS =================
socket.on("onlineUsers", (users) => {
  if (!username) return;

  const container = document.getElementById("onlineUsers");
  if (!container) return;

  container.innerHTML =
    users
      .filter(u =>
        u &&
        cleanName(u) !== cleanName(username) &&
        u !== username
      )
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

// ================= SHOW TYPING =================
socket.on("typing", (data) => {
  const bubble = document.getElementById("typingIndicator");
  if (bubble) {
    bubble.style.display = "block";
    bubble.innerText = cleanName(data.from) + " is typing...";
  }
});

// ================= STOP TYPING =================
socket.on("stopTyping", () => {
  const bubble = document.getElementById("typingIndicator");
  if (bubble) {
    bubble.style.display = "none";
    bubble.innerText = "";
  }
});

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