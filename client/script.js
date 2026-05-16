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

if (typeof loadFriends === "function") {
  await loadFriends();
}
loadPosts();

 const savedPic = localStorage.getItem("profilePic");

if (
  savedPic &&
  document.getElementById("profileModalPic")
) {
  document.getElementById(
    "profileModalPic"
  ).src = savedPic;
}

  if (!window.notifInterval) {
    loadNotifications();
    window.notifInterval = setInterval(loadNotifications, 5000);
  }
}
async function loadFriends() {
  const res = await fetch(`${API}/api/friends/${username}`);
  friendsList = await res.json();
}

// ================= SOCKET =================
socket.on("connect", () => {
  console.log("✅ CONNECTED:", socket.id);
  if (username) socket.emit("register", username);
});

// ================= CHAT OPEN (FIXED) =================
function openChat(user) {
  if (!friendsList.map(cleanName).includes(cleanName(user))) {
    alert("You are not friends yet");
    return;
  }

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

// ================= LOAD MESSAGES (SAFE) =================
async function loadMessages(user) {
  try {
    const res = await fetch(
      `${API}/api/messages/${cleanName(username)}/${cleanName(user)}`
    );

    const messages = await res.json();
    const box = document.getElementById("messagesContainer");

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

  addMessage("You", message, "✔");



  input.value = "";
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
async function openProfile(user) {

  currentProfileUser = cleanName(user);

  document.getElementById(
    "profileModal"
  ).style.display = "flex";

  document.getElementById(
    "profileModalName"
  ).innerText = "@" + user;

}

function closeProfile() {

  document.getElementById(
    "profileModal"
  ).style.display = "none";

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



function showHome() {
  document.getElementById("homeFeed").style.display = "block";
  document.getElementById("chatPage").style.display = "none";
  document.getElementById("notificationsPage").style.display = "none";
}

function showMessages() {
  document.getElementById("homeFeed").style.display = "none";
  document.getElementById("chatPage").style.display = "block";
  document.getElementById("notificationsPage").style.display = "none";
}

function showNotificationsPage() {
  document.getElementById("homeFeed").style.display = "none";
  document.getElementById("chatPage").style.display = "none";
  document.getElementById("notificationsPage").style.display = "block";

  loadNotifications();
}

// ================= LOGOUT =================
function logout() {

  localStorage.clear();

  location.reload();

}