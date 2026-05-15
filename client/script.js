function showToast(message) {

  let toast =
    document.getElementById("toast");

  if (!toast) {

    toast =
      document.createElement("div");

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

window.onerror = function(msg, url, line) {
  console.log(
    "❌ GLOBAL ERROR:",
    msg,
    "LINE:",
    line
  );
};
// ================= GLOBAL =================
let username = null;
let currentChatUser = null;
let typingTimeout = null;
let mediaRecorder;
let audioChunks = [];
let isRecording = false;

// ================= CLEAN NAME (FIXED - MUST MATCH BACKEND) =================
function cleanName(name) {
  if (!name) return "";
  return name.toString().trim().toLowerCase().replace(/\s+/g, "");
}


// ================= SAFE GET INPUT =================
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

  if (!username) {
    console.log("LOGIN FAILED");
    return;
  }

  document.getElementById("authScreen").style.display = "none";
  document.querySelector(".app").style.display = "flex";

  socket.emit("register", username);

  loadPosts();

  const savedPic = localStorage.getItem("profilePic");
  if (savedPic) {
    document.getElementById("profilePreview").src = savedPic;
  }

  // ✅ START NOTIFICATIONS ONLY AFTER LOGIN
  // ================= NOTIFICATIONS =================

  if (!window.notifInterval) {

    loadNotifications(); // run once immediately

    window.notifInterval = setInterval(() => {
      loadNotifications();
    }, 5000);

  }
}
// ================= SOCKET CONNECT =================
socket.on("connect", () => {
  console.log("✅ CONNECTED:", socket.id);
  if (username) socket.emit("register", username);
});

// ================= CHAT OPEN =================
function openChat(user) {
  if (!friendsList?.includes(user)) {
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


// ================= LOAD MESSAGES =================
async function loadMessages(user) {
  const res = await fetch(
    `${API}/api/messages/${cleanName(username)}/${cleanName(user)}`
  );

  const messages = await res.json();
  const box = document.getElementById("messagesContainer");

  box.innerHTML = "";

  messages.forEach(m => {
    if (m.message) addMessage(m.from, m.message);
    if (m.audio) addVoiceMessage(m.from, m.audio);
    if (m.image) addImageMessage(m.from, m.image);
    if (m.file) addFileMessage(m.from, m.file);
  });
}

// ================= MESSAGE UI =================
function addMessage(user, msg, status = "") {
  const box = document.getElementById("messagesContainer");
  if (!box) return;

  const isMe =
    cleanName(user) === cleanName(username);

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

  const input =
    document.getElementById("chatInput");

  if (!input) return;

  const message =
    input.value.trim();

  if (!message || !currentChatUser)
    return;

  // SHOW MY MESSAGE IMMEDIATELY
  addMessage(
    "You",
    message,
    "✔"
  );

  socket.emit("privateMessage", {

    from: username,
    to: currentChatUser,
    message

  });

  input.value = "";

}
socket.on("privateMessage", (data) => {

  console.log("📩 RECEIVED:", data);

  if (!data) return;

  const from = cleanName(data.from || "");
  const me = cleanName(username || "");

  const isMine = from === me;

  // TEXT
  if (data.message) {
    addMessage(
      isMine ? "You" : from,
      data.message
    );
  }

  // AUDIO
  if (data.audio) {
    addVoiceMessage(
      isMine ? "You" : from,
      data.audio
    );
  }

  // IMAGE
  if (data.image) {
    addImageMessage(
      isMine ? "You" : from,
      data.image
    );
  }

  // FILE
  if (data.file) {
    addFileMessage(
      isMine ? "You" : from,
      data.file
    );
  }
});

// ================= ONLINE USERS =================
socket.on("onlineUsers", (users) => {
  const container = document.getElementById("onlineUsers");

  container.innerHTML = users
    .filter(u => cleanName(u) !== cleanName(username))
 .map(u => `
  <div class="online-user">
    🟢 ${u}
    <button onclick="sendRequest('${u}')">➕</button>
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

// ================= VOICE =================
function addVoiceMessage(user, audioSrc) {
  const box = document.getElementById("messagesContainer");
const isMe =
  user === "You" ||
  cleanName(user) === cleanName(username);

  const div = document.createElement("div");
  div.className = `msg ${isMe ? "me" : "other"}`;

  div.innerHTML = `
    <div class="bubble">
      <audio controls src="${audioSrc}"></audio>
    </div>
  `;

  box.appendChild(div);
}

// ================= IMAGE MESSAGE =================

function addImageMessage(user, src) {

  const box =
    document.getElementById("messagesContainer");

  const isMe =
    user === "You" ||
    cleanName(user) === cleanName(username);

  const div =
    document.createElement("div");

  div.className =
    `msg ${isMe ? "me" : "other"}`;

  div.innerHTML = `
  
    <div class="bubble">

      <img
        src="${src}"
        class="chat-image"
        onclick="openImageViewer('${src}')"
      >

    </div>

  `;

  box.appendChild(div);

  box.scrollTop = box.scrollHeight;

}
// ================= FILE =================
function addFileMessage(user, file) {
  const box = document.getElementById("messagesContainer");

const isMe =
  user === "You" ||
  cleanName(user) === cleanName(username);

  const div = document.createElement("div");
  div.className = `msg ${isMe ? "me" : "other"}`;

  div.innerHTML = `
    <div class="bubble">
      <a href="${file.data}" download>${file.name}</a>
    </div>
  `;

  box.appendChild(div);
}

// ================= FILE SEND =================
function sendFile() {
  const file = document.getElementById("fileInput").files[0];
  if (!file || !currentChatUser) return;

  const reader = new FileReader();

  reader.onload = () => {
    socket.emit("privateMessage", {
      from: username,
      to: currentChatUser,
      file: {
        name: file.name,
        type: file.type,
        data: reader.result
      }
    });
  };

  reader.readAsDataURL(file);
}
// ================= SEND IMAGE =================

function sendImage() {

  const file =
    document.getElementById("imageInput").files[0];

  if (!file || !currentChatUser) return;

  const reader = new FileReader();

  reader.onload = () => {

    const imageData = reader.result;

    // SHOW MY IMAGE
    addImageMessage("You", imageData);

    // SEND TO RECEIVER
    socket.emit("privateMessage", {

      from: username,
      to: currentChatUser,
      image: imageData

    });

  };

  reader.readAsDataURL(file);

}
function closeProfile() {

  document.getElementById(
    "profileModal"
  ).style.display = "none";

}// ================= POSTS =================

async function loadPosts() {

  try {

    const res = await fetch(`${API}/api/posts`);

    const posts = await res.json();

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

  } catch (err) {

    console.log(
      "❌ LOAD POSTS ERROR:",
      err
    );

  }

}

// ================= CREATE POST =================

async function createPost() {

  const input =
    document.getElementById("postInput");

  if (!input) return;

  const text =
    input.value.trim();

  if (!text || !username)
    return;

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

    console.log(
      "❌ CREATE POST ERROR:",
      err
    );

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

    console.log(
      "❌ LIKE ERROR:",
      err
    );

  }

}

// ================= PROFILE VIEW =================

async function openProfile(user) {

  document.getElementById(
    "profileModal"
  ).style.display = "flex";

 document.getElementById("profileModalName").innerText = "@" + user;

  try {

    const res =
      await fetch(`${API}/api/posts`);

    const posts =
      await res.json();

    const userPosts =
      posts.filter(
        p =>
          cleanName(p.user) ===
          cleanName(user)
      );

    const firstPost =
      userPosts[0];

    document.getElementById(
      "profileModalPic"
    ).src =
      firstPost?.profilePic ||
      "https://i.imgur.com/HeIi0wU.png";

    const container =
      document.getElementById(
        "profilePosts"
      );

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

  } catch (err) {

    console.log(
      "❌ PROFILE ERROR:",
      err
    );

  }

}

// ================= PROFILE PIC =================

async function uploadProfilePic() {

  const file =
    document.getElementById(
      "profileInput"
    ).files[0];

  if (!file) return;

  const formData =
    new FormData();

  formData.append(
    "image",
    file
  );

  formData.append(
    "username",
    username
  );

  try {

    const res =
      await fetch(
        `${API}/api/upload-profile`,
        {
          method: "POST",
          body: formData
        }
      );

    const data =
      await res.json();

    if (data.profilePic) {

      document.getElementById(
        "profilePreview"
      ).src =
        data.profilePic;

      localStorage.setItem(
        "profilePic",
        data.profilePic
      );

    }

  } catch (err) {

    console.log(
      "❌ PROFILE PIC ERROR:",
      err
    );

  }

}

// ================= VOICE RECORD =================

async function startRecording() {

  try {

    if (!isRecording) {

      const stream =
        await navigator
          .mediaDevices
          .getUserMedia({
            audio: true
          });

      mediaRecorder =
        new MediaRecorder(stream);

      audioChunks = [];

      mediaRecorder.start();

      isRecording = true;

      mediaRecorder.ondataavailable =
        (e) => {
          audioChunks.push(e.data);
        };

      mediaRecorder.onstop =
        () => {

          const blob =
            new Blob(
              audioChunks,
              {
                type: "audio/webm"
              }
            );

          const reader =
            new FileReader();

          reader.readAsDataURL(blob);

          reader.onloadend =
            () => {

              socket.emit(
                "privateMessage",
                {
                  from: username,
                  to: currentChatUser,
                  audio: reader.result
                }
              );

            };

        };

    } else {

      mediaRecorder.stop();

      isRecording = false;

    }

  } catch (err) {

    console.log(
      "❌ MIC ERROR:",
      err
    );

  }

}
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

    const data = await res.json();

    showToast(
      data.message || "Request sent"
    );

  } catch (err) {

    console.log(err);

    showToast("Request failed");

  }

}
async function acceptRequest(fromUser) {

  await fetch(`${API}/api/friend-accept`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      from: fromUser,
      to: username
    })
  });

  loadNotifications();
  showToast("Friend request accepted");

}
async function rejectRequest(fromUser) {

  await fetch(`${API}/api/friend-reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      from: fromUser,
      to: username
    })
  });

  loadNotifications();
  showToast("Request rejected");

}
// ================= LOGOUT =================

function logout() {

  localStorage.removeItem(
    "profilePic"
  );

  location.reload();

}
// ================= IMAGE VIEWER =================

function openImageViewer(src) {

  document.getElementById(
    "imageViewer"
  ).style.display = "flex";

  document.getElementById(
    "viewerImage"
  ).src = src;

}

function closeImageViewer() {

  document.getElementById(
    "imageViewer"
  ).style.display = "none";

}
function showChat() {
  const chat = document.getElementById("chatPanel");
  if (chat) chat.style.display = "flex";
}

function showNotifications() {
  const notif = document.getElementById("notificationPanel");

  if (!notif) {
    console.log("Notification panel missing in HTML");
    return;
  }

  notif.classList.toggle("active");
}
async function loadNotifications() {

  if (!username) return; // 🔥 prevent null request

  try {

    const res = await fetch(
      `${API}/api/friend-requests/${username}`
    );

    const data = await res.json();

    const box = document.getElementById("notificationList");

    if (!box) return;

    box.innerHTML = "";

    data.forEach(user => {
      box.innerHTML += `
        <div class="notif-item">
          <span>${user}</span>

          <button onclick="acceptRequest('${user}')">Accept</button>
          <button onclick="rejectRequest('${user}')">Reject</button>

        </div>
      `;
    });

  } catch (err) {
    console.log("Notification error:", err);
  }
}

function showHome() {
  document.querySelector(".feed").style.display = "block";
}
function showProfile() {
  openProfile(username);
}
function showMessages() {
  showChat();
}
function showNotifications() {
  const panel = document.getElementById("notificationPanel");
  panel.classList.toggle("active");

  loadNotifications();
}
function loadNotifications() {
  if (!username) return; // ✅ STOP NULL REQUESTS
}
function showSettings() {
  showToast("Settings coming soon 🔧");
}

function showSettings() {
  const settings = document.getElementById("settingsPanel");

  if (!settings) {
    console.log("Settings panel missing in HTML");
    return;
  }

  settings.classList.toggle("active");
}