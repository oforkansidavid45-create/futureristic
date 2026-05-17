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
document.getElementById("imageInput")
.addEventListener("change", sendImage);

document.getElementById("fileInput")
.addEventListener("change", sendFile);

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

  await loadFriends();
  loadPosts();

  loadNotifications();

  window.notifInterval = setInterval(loadNotifications, 5000);

  showView("homeView"); // ✅ FIX HERE
}
 

async function loadFriends() {
  friendsList = [];
}

// ================= SOCKET =================
socket.on("connect", () => {
  console.log("✅ CONNECTED:", socket.id);
  if (username) socket.emit("register", username);
});

// ================= CHAT OPEN (FIXED) =================
 

// ================= LOAD MESSAGES (SAFE) =================
async function loadMessages(user) {
  try {
    const res = await fetch(
      `${API}/api/messages/${cleanName(username)}/${cleanName(user)}`
    );

    const messages = await res.json();
   const box = document.getElementById("notificationList");

    if (!box) return;

    box.innerHTML = "";

    messages.forEach(m => {
      if (!m) return;

      if (m.message) addMessage(m.from || "unknown", m.message);
      if (m.audio) addVoiceMessage(m.from || "unknown", m.audio);
      if (m.image) addImageMessage(m.from || "unknown", m.image);
      if (m.file) addFileMessage(m.from || "unknown", m.file);
    });

  } catch (err) {
    console.log("LOAD MESSAGE ERROR:", err);
  }
}

async function loadUserPosts(user) {
  const res = await fetch(`${API}/api/posts`);
  const posts = await res.json();

  const filtered = posts.filter(p => p.user === user);

  document.getElementById("profileView").innerHTML = `
    <h2>@${user}</h2>
    ${filtered.map(p => `
      <div class="post">
        <div class="post-text">${p.text}</div>
        <small>❤️ ${p.likes}</small>
      </div>
    `).join("")}
  `;
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

  addMessage(username, message, "✔");

  socket.emit("privateMessage", {
    from: username,
    to: currentChatUser,
    message
  });

  input.value = "";
}
function openProfile(user) {
  showView("profileView");

  document.getElementById("profileView").innerHTML = `
    <div class="profile-feed">
      <h2>@${user}</h2>
      <p>Loading posts...</p>
    </div>
  `;
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

socket.on("typing", (data) => {

  const typing =
    document.getElementById("typingIndicator");

  if (!typing) return;

  typing.innerText =
    `${data.from} is typing...`;

});

socket.on("stopTyping", () => {

  const typing =
    document.getElementById("typingIndicator");

  if (!typing) return;

  typing.innerText = "";

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
function openImageViewer(src) {
  document.getElementById("imageViewer").style.display = "flex";
  document.getElementById("viewerImage").src = src;
}

function closeImageViewer() {
  document.getElementById("imageViewer").style.display = "none";
}
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

  }, 1000);

}

// ================= SEND FILE =================
function sendFile() {

  const file =
    document.getElementById("fileInput")?.files[0];

  if (!file || !currentChatUser) return;

  const reader = new FileReader();

  reader.onload = () => {

   addFileMessage("You", {
  name: file.name,
  data: reader.result
});

socket.emit("privateMessage", {

      from: username,
      to: currentChatUser,

      file: {
        name: file.name,
        data: reader.result
      }

    });

  };

  reader.readAsDataURL(file);

}

// ================= SEND IMAGE =================
function sendImage() {

  const file =
    document.getElementById("imageInput")?.files[0];

  if (!file || !currentChatUser) return;

  const reader = new FileReader();

  reader.onload = () => {

    socket.emit("privateMessage", {

      from: username,
      to: currentChatUser,
      image: reader.result

    });

  };

  reader.readAsDataURL(file);

}

// ================= VOICE RECORD =================
async function startRecording() {

  try {

    if (!isRecording) {

      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true
        });

      mediaRecorder =
        new MediaRecorder(stream);

      audioChunks = [];

      mediaRecorder.start();

      isRecording = true;

      mediaRecorder.ondataavailable = (e) => {
        audioChunks.push(e.data);
      };

      mediaRecorder.onstop = () => {

        const blob =
          new Blob(audioChunks, {
            type: "audio/webm"
          });

        const reader =
          new FileReader();

        reader.readAsDataURL(blob);

        reader.onloadend = () => {
          addVoiceMessage("You", reader.result);

          socket.emit("privateMessage", {

            from: username,
            to: currentChatUser,
            audio: reader.result

          });

        };

      };

    } else {

      mediaRecorder.stop();

      isRecording = false;

    }

  } catch (err) {

    console.log("MIC ERROR:", err);

  }

}

// ================= LOAD POSTS =================
async function loadPosts() {

  try {

    const res =
      await fetch(`${API}/api/posts`);

    const posts =
      await res.json();

    const container =
      document.getElementById("posts");

    if (!container) return;

    container.innerHTML = "";

    posts.forEach(post => {

      const div =
        document.createElement("div");

      div.className = "post";

      div.innerHTML = `

        <div class="post-top">

          <img
            src="${post.profilePic || 'https://i.imgur.com/HeIi0wU.png'}"
            class="post-avatar"
            onclick="openProfile('${post.user}')"
          >

          <div>

            <div
              class="post-user"
              onclick="openProfile('${post.user}')"
            >
              ${post.user}
            </div>

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

  } catch (err) {

    console.log("LOAD POSTS ERROR:", err);

  }

}

// ================= CREATE POST =================
async function createPost() {

  const input =
    document.getElementById("postInput");

  if (!input) return;

  const text =
    input.value.trim();

  if (!text) return;

  try {

    await fetch(`${API}/api/posts`, {

      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        user: username,
        text
      })

    });

    input.value = "";

    loadPosts();

  } catch (err) {

    console.log("POST ERROR:", err);

  }

}

// ================= LIKE POST =================
async function likePost(id) {

  try {

    await fetch(
      `${API}/api/posts/like/${id}`,
      {
        method: "PUT"
      }
    );

    loadPosts();

  } catch (err) {

    console.log("LIKE ERROR:", err);

  }

}

// ================= PROFILE =================

function showProfile() {
  openProfile(username);
}

async function openProfile(user) {

  showView("profileView");

  const profile = document.getElementById("profileView");

  profile.innerHTML = `
    <div class="profile-feed">

      <img src="https://i.imgur.com/HeIi0wU.png"
      class="profile-pic-large">

      <h2>@${user}</h2>

      <div id="userPosts"></div>

    </div>
  `;

  const res = await fetch(`${API}/api/posts`);
  const posts = await res.json();

  const filtered = posts.filter(
    p => cleanName(p.user) === cleanName(user)
  );

  document.getElementById("userPosts").innerHTML =
    filtered.map(p => `
      <div class="post">
        <div class="post-text">${p.text}</div>
      </div>
    `).join("");

}


// ================= FRIEND REQUEST =================
async function sendRequest(user) {

  try {

    const res = await fetch(
      `${API}/api/friend-request`,
      {

        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          from: username,
          to: user
        })

      }
    );

    const data =
      await res.json();

    showToast(
      data.message || "Request sent"
    );

  } catch (err) {

    console.log(err);

  }

}

// ================= ACCEPT =================
async function acceptRequest(fromUser) {

  await fetch(
    `${API}/api/friend-accept`,
    {

      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        from: fromUser,
        to: username
      })

    }
  );

  loadFriends();

  loadNotifications();

}

// ================= REJECT =================
async function rejectRequest(fromUser) {

  await fetch(
    `${API}/api/friend-reject`,
    {

      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        from: fromUser,
        to: username
      })

    }
  );

  loadNotifications();

}

// ================= NOTIFICATIONS =================
async function loadNotifications() {

  if (!username) return;

  try {

    const res =
      await fetch(
        `${API}/api/friend-requests/${username}`
      );

    const data =
      await res.json();

    const box =
document.getElementById("notificationList");

    if (!box) return;

    box.innerHTML = "";

    data.forEach(user => {

      box.innerHTML += `

        <div class="notif-item">

          <span>${user}</span>

          <button onclick="acceptRequest('${user}')">
            Accept
          </button>

          <button onclick="rejectRequest('${user}')">
            Reject
          </button>

        </div>

      `;

    });

  } catch (err) {

    console.log(err);

  }

}

// ================= ONLINE USERS =================
socket.on("onlineUsers", (users) => {

  const container = document.getElementById("onlineUsers");
  if (!container) return;

  container.innerHTML = users
    .filter(u => cleanName(u) !== cleanName(username))
    .map(u => `

      <div class="online-user">

        <span onclick="openChat('${u}')">
          ${u}
        </span>

        <button onclick="sendRequest('${u}')">+</button>

      </div>

    `)
    .join("");

});

// ================= LIVE REQUEST =================
socket.on("friendRequest", (data) => {

  showToast(
    `${data.from} sent you a request`
  );

  loadNotifications();

});

// ================= SETTINGS =================
function toggleSettings() {

  const panel =
    document.getElementById("settingsPanel");

  if (!panel) return;

  panel.classList.toggle("active");

}



function showView(view) {
 const views = [
  "homeView",
  "chatView",
  "notificationView",
  "profileView",
  "settingsView"
];

  views.forEach(v => {
    const el = document.getElementById(v);
    if (el) el.style.display = "none";
  });

  const active = document.getElementById(view);
  if (active) active.style.display = "block";

  // RESET UI STATE
  const chatInputArea = document.getElementById("chatInputArea");
  if (chatInputArea) chatInputArea.style.display = "none";
}


function showHome() {
  showView("homeView");
}



function showNotificationsPage() {
  showView("notificationView");
  loadNotifications();
}

function openChat(user) {

  if (!friendsList.map(cleanName).includes(cleanName(user))) {
    alert("You are not friends yet");
    return;
  }

  currentChatUser = cleanName(user);

  document.getElementById("chatTitle").innerText =
    "Chat with " + user;

  document.getElementById("messagesContainer").innerHTML = "";
document.getElementById("chatArea").style.display = "block"; // 🔥 FIXED

  loadMessages(currentChatUser);

  document.getElementById("chatInputArea").style.display = "flex";
}
window.addEventListener("load", () => {
  setTimeout(() => {
    const splash = document.getElementById("splashScreen");
    if (splash) splash.style.display = "none";

    document.getElementById("authScreen").style.display = "flex";
  }, 2000);
});
function showMessages() {

  document.getElementById(
  "chatArea"
).style.display = "flex";

  const list =
    document.getElementById("friendsList");

  list.innerHTML = "";

  friendsList.forEach(friend => {

    list.innerHTML += `

      <div class="friend-item"
        onclick="openChat('${friend}')">

        <img
        src="https://i.imgur.com/HeIi0wU.png"
        class="friend-avatar">

        <span>${friend}</span>

      </div>

    `;

  });

}
function showSettings() {
  showView("settingsView");
}

// ================= LOGOUT =================
function logout() {

  localStorage.clear();

  location.reload();

}
