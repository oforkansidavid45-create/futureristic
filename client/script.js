  let user = null;

  let currentProfileUser = null;
  const userProfiles = {};

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

  const imageInput = document.getElementById("imageInput");

  if (imageInput) {
    imageInput.addEventListener("change", handleImageUpload);
  }

  const fileInput = document.getElementById("fileInput");

  if (fileInput) {
    fileInput.addEventListener("change", handleFileUpload);
  }



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
 document.getElementById("app").style.display = "flex";
document.getElementById("app").style.flexDirection = "column";

    socket.emit("register", username);

    await loadFriends();
    loadPosts();

    loadNotifications();

    window.notifInterval = setInterval(loadNotifications, 5000);

    showView("homeView"); // ✅ FIX HERE
  }
  
  async function loadFriends() {

    try {

      const res = await fetch(
        `${API}/api/friends/${username}`
      );

      friendsList = await res.json();

      console.log("FRIENDS:", friendsList);

    } catch (err) {

      console.log("FRIEND LOAD ERROR:", err);

    }

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

 

  function handleFileUpload() {
    sendFile();
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

  function handleImageUpload() {
    sendImage();
  }

  function handleFileUpload() {
    sendFile();
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

    // IMPORTANT
    for (const post of posts) {

      // LOAD USER PROFILE PIC
      const profilePic =
        await getProfilePic(post.user);

      const div =
        document.createElement("div");

      div.className = "post";

      div.innerHTML = `

        <div class="post-top">

          <img
            src="${profilePic || 'https://i.imgur.com/HeIi0wU.png'}"
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

        <div class="post-body">

          <div class="post-text">
            ${post.text || ""}
          </div>

          ${post.image ? `
            <img
              src="${post.image}"
              class="post-media"
            >
          ` : ""}

          ${post.video ? `
            <video controls class="post-media">
              <source src="${post.video}">
            </video>
          ` : ""}

        </div>

        <div class="post-actions-bar">

          <button
            class="future-btn like-btn ${post.likedBy?.includes(username) ? 'liked' : ''}"
            onclick="toggleLike('${post._id}')"
          >

            ${post.likedBy?.includes(username)
              ? '🩵'
              : '🤍'}

            <span>${post.likes}</span>

          </button>

          <button
            class="future-btn comment-btn"
            onclick="toggleComments('${post._id}')"
          >
            💬
          </button>

        </div>

        <div
          class="comments-section"
          id="comments-${post._id}"
          style="display:none;"
        >

          <div class="comment-input-box">

            <input
              type="text"
              id="commentInput-${post._id}"
              placeholder="Write a comment..."
            >

            <button onclick="addComment('${post._id}')">
              Post
            </button>

          </div>

          <div class="comments-list">

            ${(post.comments || []).map(c => `

              <div class="comment-item">

                <b>${c.user}</b>

                <p>${c.text}</p>

              </div>

            `).join("")}

          </div>

        </div>
      `;

      container.appendChild(div);

    }

  } catch (err) {

    console.log("LOAD POSTS ERROR:", err);

  }

}
async function getProfilePic(user) {

  try {

    const res =
      await fetch(`${API}/api/user/${user}`);

    const data =
      await res.json();

    return data.profilePic ||
      "https://i.imgur.com/HeIi0wU.png";

  } catch (err) {

    return "https://i.imgur.com/HeIi0wU.png";

  }

}
  // ================= CREATE POST =================
async function createPost() {

  const text =
    document.getElementById("postInput").value;

  const image =
    document.getElementById("postImage").files[0];

  const video =
    document.getElementById("postVideo").files[0];

  if (!text && !image && !video) return;

  const formData = new FormData();

  formData.append("user", username);
  formData.append("text", text);

  if (image) {
    formData.append("image", image);
  }

  if (video) {
    formData.append("video", video);
  }

const res = await fetch(`${API}/api/posts`, {
method:"POST",
body:formData
});

const data = await res.json();

console.log(data);;

  document.getElementById("postInput").value = "";

  loadPosts();

}

function openPostModal(){

  document.getElementById(
    "postModal"
  ).style.display = "flex";

  document.getElementById(
    "postUsername"
  ).innerText = username;

}

function closePostModal(){

  document.getElementById(
    "postModal"
  ).style.display = "none";

}

function toggleComments(id){

const box =
document.getElementById(`comments-${id}`);

if(
box.style.display === "none"
){

box.style.display = "block";

}else{

box.style.display = "none";

}

}

async function addComment(id){

const input =
document.getElementById(
`commentInput-${id}`
);

const text = input.value.trim();

if(!text) return;

await fetch(
`${API}/api/posts/comment/${id}`,
{
method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({
user:username,
text
})
}
);

loadPosts();

}

  // ================= LIKE POST =================
async function toggleLike(id){

await fetch(
`${API}/api/posts/like/${id}`,
{
method:"PUT",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({
username
})
}
);

loadPosts();

}

  // ================= PROFILE =================

async function openProfile(user) {

  currentProfileUser = user;

  const modal = document.getElementById("profileModal");

  modal.style.display = "flex";

  document.getElementById(
    "profileModalName"
  ).innerText = "@" + user;

  const res = await fetch(`${API}/api/posts`);

  const posts = await res.json();

  const userPosts = posts.filter(
    p => cleanName(p.user) === cleanName(user)
  );

  // KEEP ORIGINAL MODAL
  let postsBox = document.getElementById("profilePosts");

  // CREATE POSTS CONTAINER IF MISSING
  if (!postsBox) {

    postsBox = document.createElement("div");

    postsBox.id = "profilePosts";

    document.querySelector(".profile-content")
      .appendChild(postsBox);
  }

  postsBox.innerHTML = userPosts.map(post => `

    <div class="post">

      <div class="post-text">
        ${post.text}
      </div>

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
  method:"POST",
  headers:{
  "Content-Type":"application/json"
  },
  body:JSON.stringify({
  from:fromUser,
  to:username
  })
  }
  );

  await loadFriends();

  loadNotifications();

  showToast("Friend added");

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

      const res = await fetch(
        `${API}/api/friend-requests/${username}`
      );

      const data = await res.json();

      const box =
        document.getElementById("notificationList");

      if (!box) return;

      box.innerHTML = "";

      data.forEach(user => {

        box.innerHTML += `

        <div class="notif-card">

          <img
            src="https://i.imgur.com/HeIi0wU.png"
            class="notif-avatar"
          >

          <div class="notif-info">
            <b>${user}</b>
            <p>sent you a friend request</p>
          </div>

          <div class="notif-actions">

            <button
              class="accept-btn"
              onclick="acceptRequest('${user}')"
            >
              Accept
            </button>

            <button
              class="reject-btn"
              onclick="rejectRequest('${user}')"
            >
              Reject
            </button>

          </div>

        </div>

        `;

      });

    } catch (err) {

      console.log(err);

    }

  }




  // ================= ONLINE USERS =================
  // ================= ONLINE USERS =================

  socket.on("onlineUsers", (users) => {

    const container =
      document.getElementById("onlineUsers");

    if (!container) return;

    container.innerHTML = users
      .filter(
        u =>
        cleanName(u) !== cleanName(username)
      )

      .map(u => `

        <div class="online-card">

          <div class="online-left">

            <img
              src="https://i.imgur.com/HeIi0wU.png"
              class="online-avatar"
            >

            <div>

              <div class="online-name">
                ${u}
              </div>

              <small class="online-status">
                online
              </small>

            </div>

          </div>

          <button
            class="add-friend-btn"
            onclick="sendRequest('${u}')"
          >
            Add
          </button>

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

  function searchFriends() {

  const input =
    document.getElementById("friendSearch");

  const filter =
    input.value.toLowerCase();

  const cards =
    document.querySelectorAll(".online-card");

  cards.forEach(card => {

    const name =
      card.innerText.toLowerCase();

    card.style.display =
      name.includes(filter)
      ? "flex"
      : "none";

  });

}

  function showHome() {
    showView("homeView");
  }



  function showNotificationsPage() {
    showView("notificationView");
    loadNotifications();
  }
  function openChat(user) {

    currentChatUser = cleanName(user);

    document.getElementById(
      "chatTitle"
    ).innerText = "Chat with " + user;

    document.getElementById(
      "messagesContainer"
    ).innerHTML = "";

    showView("chatView");

    document.getElementById(
      "chatArea"
    ).style.display = "flex";

    document.getElementById(
      "chatInputArea"
    ).style.display = "flex";

    loadMessages(user);

  }


  window.addEventListener("load", () => {
    setTimeout(() => {
      const splash = document.getElementById("splashScreen");
      if (splash) splash.style.display = "none";

      document.getElementById("authScreen").style.display = "flex";
    }, 2000);
  });
  function showMessages() {

    showView("chatView");

    const list =
      document.getElementById("friendsList");

    list.innerHTML = "";

if (friendsList.length === 0) {

list.innerHTML = `

<div class="empty-chat-box">

  <h2>Add Friends</h2>

  <p>
    Search for users and start chatting
  </p>

</div>

`;
return;

}
    friendsList.forEach(friend => {

      list.innerHTML += `

        <div
          class="friend-item"
          onclick="openChat('${friend}')"
        >

          <img
            src="https://i.imgur.com/HeIi0wU.png"
            class="friend-avatar"
          >

          <div class="friend-info">

            <div class="friend-name">
              ${friend}
            </div>

            <div class="friend-status">
              Tap to chat
            </div>

          </div>

        </div>

      `;

    });

  }
  // ================= PROFILE UPLOAD =================

  document.addEventListener("DOMContentLoaded", () => {

    const picInput =
      document.getElementById("profilePicInput");

    if (picInput) {
      picInput.addEventListener(
        "change",
        uploadProfilePic
      );
    }

  });

async function uploadProfilePic(e){

  const file = e.target.files[0];

  if(!file) return;

  const formData = new FormData();

  formData.append("image", file);
  formData.append("username", username);

  try {

    const res = await fetch(
      `${API}/api/upload-profile`,
      {
        method:"POST",
        body:formData
      }
    );

    const data = await res.json();

    if(data.profilePic){

      const profilePic =
        document.getElementById("profileModalPic");

      if(profilePic){
        profilePic.src = data.profilePic;
      }

      loadPosts();

      showToast("Profile updated ✅");

    }

  } catch(err){

    console.log("UPLOAD ERROR:", err);

  }

}
socket.on("profileUpdated",()=>{

loadPosts();

});

document.getElementById(
"profilePicInput"
)?.addEventListener(
"change",
previewProfilePic
);

function previewProfilePic(e){

const file = e.target.files[0];

if(!file) return;

const reader = new FileReader();

reader.onload = ev => {

document.getElementById(
"profileModalPic"
).src = ev.target.result;

};

reader.readAsDataURL(file);

}

  function showSettings() {
    showView("settingsView");
  }
  function closeProfile() {
    const modal = document.getElementById("profileModal");
    if (modal) modal.style.display = "none";
  } 

  // ================= LOGOUT =================
  function logout() {

    localStorage.clear();

    location.reload();

  }
  function showProfile() {

  if (!username) return;

  openProfile(username);

}


async function searchUsersMain(){

  const value =
    document.getElementById("mainSearch")
    .value
    .trim();

  const box =
    document.getElementById("searchResults");

  if(!value){

    box.innerHTML = "";

    return;

  }

  const res = await fetch(
    `${API}/api/search-users/${value}`
  );

  const users = await res.json();

  box.innerHTML = "";

  users.forEach(user => {

    box.innerHTML += `

      <div class="search-user">

        <img
          src="${
            user.profilePic ||
            'https://i.imgur.com/HeIi0wU.png'
          }"
          class="post-avatar"
        >

        <div
          onclick="openProfile('${user.username}')"
        >
          ${user.username}
        </div>

        <button
          onclick="sendRequest('${user.username}')"
          class="add-friend-btn"
        >
          Add
        </button>

      </div>

    `;

  });

}
document.getElementById("postImage")
?.addEventListener("change", previewPostMedia);

document.getElementById("postVideo")
?.addEventListener("change", previewPostMedia);

function previewPostMedia(){

const preview =
document.getElementById(
"previewArea"
);

preview.innerHTML = "";

const image =
document.getElementById(
"postImage"
).files[0];

const video =
document.getElementById(
"postVideo"
).files[0];

if(image){

const url =
URL.createObjectURL(image);

preview.innerHTML = `

<div class="future-preview-box">

<img
src="${url}"
class="future-preview-media"
>

<div class="future-preview-tools">

<button>
✂ Crop
</button>

<button>
✨ HD
</button>

<button>
🎨 Filter
</button>

<button>
🌟 Enhance
</button>

</div>

</div>

`;

}

if(video){

const url =
URL.createObjectURL(video);

preview.innerHTML = `

<div class="future-preview-box">

<video
controls
class="future-preview-media"
>
<source src="${url}">
</video>

<div class="future-preview-tools">

<button>
🎬 HD
</button>

<button>
⚡ Ultra
</button>

<button>
📱 Mobile
</button>

</div>

</div>

`;

}

}