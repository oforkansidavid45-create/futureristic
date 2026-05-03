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
    loadPosts();
  } else {
    alert("Wrong login details");
  }
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

  // ✅ FIX: DO NOT WIPE WHOLE CHAT
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

    const msgBox = document.getElementById("messagesContainer");

    msgBox.innerHTML = "";

    messages.forEach(m => {
      if (m.from === cleanName(username)) {
        addMessage("You", m.message);
      } else {
        addMessage(m.from, m.message);
      }
    });

  } catch (err) {
    console.log("❌ loadMessages error:", err);
  }
}

// ================= MESSAGE UI =================
function addMessage(user, msg, status = "") {
  const box = document.getElementById("messagesContainer");

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

  if (currentChatUser && fromClean === cleanName(currentChatUser)) {
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

  document.getElementById("onlineUsers").innerHTML =
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
  if (!currentChatUser) return;

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

// ================= VOICE NOTES =================
async function startRecording() {
  if (!navigator.mediaDevices) return alert("Mic not supported");

  if (!isRecording) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (e) => {
      audioChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: "audio/webm" });

      const reader = new FileReader();
      reader.onload = () => {
        sendVoiceMessage(reader.result);
      };

      reader.readAsDataURL(audioBlob);
    };

    mediaRecorder.start();
    isRecording = true;

    alert("🎤 Recording... click again to stop");
  } else {
    mediaRecorder.stop();
    isRecording = false;
  }
}

// ================= SEND VOICE =================
function sendVoiceMessage(audioData) {
  if (!currentChatUser || !username || !audioData) return;

  socket.emit("privateMessage", {
    from: username,
    to: currentChatUser,
    message: "[VOICE]",
    audio: audioData
  });

  addVoiceMessage("You", audioData);
}

// ================= SHOW VOICE =================
function addVoiceMessage(user, audioData) {
  const box = document.getElementById("messagesContainer");

  const div = document.createElement("div");
  div.className = "chat-msg";

  if (user === "You") div.classList.add("my-msg");

  div.innerHTML = `
    <b>${user}:</b><br/>
    <audio controls src="${audioData}"></audio>
  `;

  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}