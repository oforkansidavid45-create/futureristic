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

  document.getElementById("authScreen").style.display = "none";
  document.querySelector(".app").style.display = "flex";

  socket.emit("register", username);
  loadPosts();

  const savedPic = localStorage.getItem("profilePic");
  if (savedPic) {
    document.getElementById("profilePreview").src = savedPic;
  }
}

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

  const isMe = cleanName(user) === cleanName(username);

  const div = document.createElement("div");
  div.className = `msg ${isMe ? "me" : "other"}`;

  div.innerHTML = `
    <div class="bubble">
      <div>${msg}</div>
      <div class="meta">
        <span>${new Date().toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})}</span>
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

  const from =
    cleanName(data.from || "");

  const me =
    cleanName(username || "");

  // DON'T SHOW MY OWN MESSAGE AGAIN
  if (from === me) return;

  // TEXT
  if (data.message) {

    addMessage(
      from,
      data.message
    );

  }

  // AUDIO
  if (data.audio) {

    addVoiceMessage(
      from,
      data.audio
    );

  }

  // IMAGE
  if (data.image) {

    addImageMessage(
      from,
      data.image
    );

  }

  // FILE
  if (data.file) {

    addFileMessage(
      from,
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
      <div class="online-user" onclick="openChat('${u}')">
        🟢 ${u}
      </div>
    `).join("");
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
      <img src="${src}" class="chat-image">
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

  document.getElementById(
    "profileModalName"
  ).innerText = user;

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

// ================= LOGOUT =================

function logout() {

  localStorage.removeItem(
    "profilePic"
  );

  location.reload();

}