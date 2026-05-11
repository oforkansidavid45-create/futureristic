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

    alert("Account created! Now login");

  } catch (err) {
    console.log("❌ ERROR:", err);
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
  const savedPic = localStorage.getItem("profilePic");

if (savedPic) {
  document.getElementById("profilePreview").src = savedPic;
}
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
  div.className = `msg ${isMe ? "me" : "other"}`;

  div.innerHTML = `
    <div class="bubble">
      <div class="text">${msg}</div>

      <div class="meta">
        <span class="time">${new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit"
        })}</span>

     ${isMe ? `<span class="msg-status">${status}</span>` : ""}
      </div>
    </div>
  `;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;

  return div; // ✅ IMPORTANT (we will update tick later)
}
// ================= SEND MESSAGE =================

function sendMessage() {
  const input = document.getElementById("chatInput");
  if (!input) return;

  const message = input.value.trim();
  if (!message || !currentChatUser) return;

  // create message FIRST and keep reference
  const msgEl = addMessage("You", message, "✔");

  socket.emit("privateMessage", {
    from: username,
    to: currentChatUser,
    message
  });

  input.value = "";
}
// ================= RECEIVE MESSAGE =================

// ====// ================= RECEIVE MESSAGE =================
// ================= RECEIVE MESSAGE =================

// ================= RECEIVE MESSAGE =================

socket.on("privateMessage", (data) => {

  console.log("📩 RECEIVED:", data);

  if (!data) return;

  const from = cleanName(data.from || "");
  const me = cleanName(username || "");
  const current = cleanName(currentChatUser || "");

  const isMyMessage = from === me;

  // STOP DUPLICATE
  if (isMyMessage) return;

  // ONLY SHOW IF CHAT OPEN
  if (current !== from) return;

  // ================= AUDIO =================
  if (data.audio) {

    addVoiceMessage(from, data.audio);

  }

  // ================= TEXT =================
  else if (data.message) {

    addMessage(from, data.message);

  }

  // DELIVERY
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
socket.on("messageStatus", (data) => {
  const ticks = document.querySelectorAll(".tick");

  if (ticks.length) {
    const lastTick = ticks[ticks.length - 1];

    if (data.status === "delivered") {
      lastTick.innerText = "✔✔";
      lastTick.style.color = "gray";
    }
  }
});
socket.on("messageSeen", () => {
  document.querySelectorAll(".msg-status").forEach(el => {
    el.innerText = "✔✔";
    el.style.color = "cyan";
  });
});
// ================= POSTS =================
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
    
      <div class="post-top">

      <img
  src="${post.profilePic || 'https://i.imgur.com/HeIi0wU.png'}"
  class="post-avatar"
  onclick="openProfile('${post.user}')"
/>

        <div>
<div
  class="post-user"
  onclick="openProfile('${post.user}')"
>
  ${post.user}
</div>

          <small class="post-time">
            Just now
          </small>

        </div>

      </div>

      <div class="post-text">
        ${post.text}
      </div>

      <button
        class="like-btn"
        onclick="likePost('${post._id}')"
      >
        ❤️ ${post.likes}
      </button>

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
// ================= VOICE RECORD =================

async function startRecording() {

  try {

    // START RECORDING
    if (!isRecording) {

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });

      mediaRecorder = new MediaRecorder(stream);

      audioChunks = [];

      mediaRecorder.start();

      isRecording = true;

      console.log("🎙️ Recording started");

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {

        const audioBlob = new Blob(audioChunks, {
          type: "audio/webm"
        });

        const reader = new FileReader();

        reader.readAsDataURL(audioBlob);

        reader.onloadend = () => {

          const base64Audio = reader.result;

          // SHOW MY AUDIO
          addVoiceMessage("You", base64Audio);

          // SEND TO SERVER
          socket.emit("privateMessage", {
            from: username,
            to: currentChatUser,
            audio: base64Audio
          });

        };

      };

    }

    // STOP RECORDING
    else {

      mediaRecorder.stop();

      isRecording = false;

      console.log("🛑 Recording stopped");

    }

  } catch (err) {

    console.log("❌ MIC ERROR:", err);

    alert("Microphone access denied");

  }

}

// ================= VOICE UI =================

function addVoiceMessage(user, audioSrc) {

  const box = document.getElementById("messagesContainer");

  if (!box) return;

  const isMe = user === "You";

  const div = document.createElement("div");

  div.className = `msg ${isMe ? "me" : "other"}`;

  div.innerHTML = `
    <div class="bubble">
      <audio controls>
        <source src="${audioSrc}" type="audio/webm">
      </audio>
    </div>
  `;

  box.appendChild(div);

  box.scrollTop = box.scrollHeight;

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
// ================= PROFILE VIEW =================

// ================= PROFILE VIEW =================

async function openProfile(user) {

  document.getElementById(
    "profileModal"
  ).style.display = "flex";

  document.getElementById(
    "profileModalName"
  ).innerText = user;

  const res = await fetch(`${API}/api/posts`);

  const posts = await res.json();

  const userPosts =
    posts.filter(
      p => cleanName(p.user) === cleanName(user)
    );

  // SET PROFILE PIC
  const firstPost = userPosts[0];

  document.getElementById(
    "profileModalPic"
  ).src =
    firstPost?.profilePic ||
    "https://i.imgur.com/HeIi0wU.png";

  const container =
    document.getElementById("profilePosts");

  container.innerHTML = "";

  if (userPosts.length === 0) {

    container.innerHTML =
      "<p style='padding:20px;'>No posts yet</p>";

    return;
  }

  userPosts.forEach(post => {

    container.innerHTML += `
    
      <div class="profile-post">

        ${post.text}

      </div>

    `;

  });

}

function closeProfile() {

  document.getElementById(
    "profileModal"
  ).style.display = "none";

}

function closeProfile() {

  document.getElementById(
    "profileModal"
  ).style.display = "none";

}
// ================= PROFILE PIC =================

async function uploadProfilePic() {

  const file =
    document.getElementById("profileInput").files[0];

  if (!file) return;

  const formData = new FormData();

  formData.append("image", file);
  formData.append("username", username);

  try {

    const res = await fetch(
      `${API}/api/upload-profile`,
      {
        method: "POST",
        body: formData
      }
    );

    const data = await res.json();

    if (data.profilePic) {

      document.getElementById(
        "profilePreview"
      ).src = data.profilePic;

      localStorage.setItem(
        "profilePic",
        data.profilePic
      );

    }

  } catch (err) {

    console.log(err);
    alert("Upload failed");

  }

}

function logout() {
  localStorage.removeItem("fb_user");
  location.reload();
}