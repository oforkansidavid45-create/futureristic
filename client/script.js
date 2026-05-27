

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
function addMessage(user, msg, status = "sent") {

  const box =
    document.getElementById("messagesContainer");

  if (!box) return;

  const isMe =
    cleanName(user) === cleanName(username);

  const div =
    document.createElement("div");

  div.className =
    `msg ${isMe ? "me" : "other"}`;

let ticks = "";

if(isMe){

  if(status === "sent"){
    ticks = `
      <span class="msg-status">
        <i class="fa-solid fa-check"></i>
      </span>
    `;
  }

  if(status === "delivered"){
    ticks = `
  <span class="msg-status insta-status">
    Seen
  </span>
`;
  }

  if(status === "seen"){
    ticks = `
      <span class="msg-status seen">
        <i class="fa-solid fa-check-double"></i>
      </span>
    `;
  }

}

  div.innerHTML = `

    <div class="bubble">

      <div class="msg-text">
        ${msg}
      </div>

      <div class="msg-meta">

        <span class="msg-time">

          ${new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
          })}

        </span>

        ${
          isMe
          ?
          `${ticks}`
          :
          ""
        }

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

    addMessage(username, message, "sent");

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

console.log("POST:", post);
console.log("IMAGE:", post.image);
console.log("VIDEO:", post.video);
      // LOAD USER PROFILE PIC
      const profilePic =
        await getProfilePic(post.user);

      const div =
        document.createElement("div");

      div.className = "post";

      div.innerHTML = `

       <div class="post-top">

  <div class="post-user-row">

    <div class="post-user-left">

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

    ${
      cleanName(post.user)
      ===
      cleanName(username)
      ?
      `
      <button
        class="delete-post-btn"
        onclick="deletePost('${post._id}')"
      >
        <i class="fa-solid fa-trash"></i>
      </button>
      `
      :
      ``
    }

  </div>

</div>
         

        <div class="post-body">

          <div class="post-text">
            ${post.text || ""}
          </div>

      ${post.image ? `
  <img
    src="${post.image}"
    class="post-media post-image"
  />
` : ""}
          ${post.video ? `
  <video controls class="post-media post-video">
    <source src="${post.video}" type="video/mp4">
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
      await fetch(
        `${API}/api/user/${encodeURIComponent(user)}`
      );

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

  if (!text && !image && !video) {
    return alert("Add something");
  }

  const formData = new FormData();

  formData.append("user", username);
  formData.append("text", text);

  if (image) {
    formData.append("image", image);
  }

  if (video) {
    formData.append("video", video);
  }

  try {

    const res = await fetch(
      `${API}/api/posts`,
      {
        method: "POST",
        body: formData
      }
    );

    const data = await res.json();

    console.log("POST RESPONSE:", data);

    if (data.error) {
      alert(data.error);
      return;
    }

    document.getElementById("postInput").value = "";

    document.getElementById("postImage").value = "";

    document.getElementById("postVideo").value = "";

    document.getElementById("previewArea").innerHTML = "";

    closePostModal();

    loadPosts();

  } catch (err) {

    console.log("CREATE POST ERROR:", err);

  }

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

  // SAVE MY FRIENDS
  let savedFriends =
    JSON.parse(
      localStorage.getItem(
        `friends_${username}`
      )
    ) || [];

  if(!savedFriends.includes(fromUser)){

    savedFriends.push(fromUser);

    localStorage.setItem(
      `friends_${username}`,
      JSON.stringify(savedFriends)
    );

  }

  // SAVE ME TO THEIR FRIENDS
  let theirFriends =
    JSON.parse(
      localStorage.getItem(
        `friends_${fromUser}`
      )
    ) || [];

  if(!theirFriends.includes(username)){

    theirFriends.push(username);

    localStorage.setItem(
      `friends_${fromUser}`,
      JSON.stringify(theirFriends)
    );

  }

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

data.forEach(req => {

  const sender =
    typeof req === "string"
    ? cleanName(req)
    : cleanName(
        req.from ||
        req.username ||
        req.user
      );

  if (
    !sender ||
    sender === "null" ||
    sender === "undefined"
  ) return;

  box.innerHTML += `

    <div class="notif-card">

      <img
        src="https://i.imgur.com/HeIi0wU.png"
        class="notif-avatar"
      >

      <div class="notif-info">

        <b>${sender}</b>

        <p>sent you a friend request</p>

      </div>

      <div class="notif-actions">

        <button
          class="accept-btn"
          onclick="acceptRequest('${sender}')"
        >
          Accept
        </button>

        <button
          class="reject-btn"
          onclick="rejectRequest('${sender}')"
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

  // ================= SEND FRIEND REQUEST =================
// ================= SEND FRIEND REQUEST =================
async function sendRequest(toUser) {

  if (!toUser) return;

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
          to: toUser
        })

      }
    );

    const data = await res.json();

    console.log("REQUEST RESPONSE:", data);

    if (data.error) {
      alert(data.error);
      return;
    }

    showToast(`Friend request sent to ${toUser}`);

  } catch (err) {

    console.log("SEND REQUEST ERROR:", err);

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
  "settingsView",
  "reelsView"
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
if(!user) return;
  currentChatUser = cleanName(user);

  showView("chatView");

  // HIDE EMPTY SCREEN
  const emptyChat =
    document.getElementById("emptyChat");

  if(emptyChat){
    emptyChat.style.display = "none";
  }

  // SHOW ACTIVE CHAT
  const activeChat =
    document.getElementById("activeChatBox");

  if(activeChat){
    activeChat.style.display = "flex";
    activeChat.style.flexDirection = "column";
  }

  // SHOW INPUT
  const chatInputArea =
    document.getElementById("chatInputArea");

  if(chatInputArea){
    chatInputArea.style.display = "flex";
  }

  // TITLE
  document.getElementById(
    "chatTitle"
  ).innerText = user;

  // CLEAR OLD
  document.getElementById(
    "messagesContainer"
  ).innerHTML = "";

  // LOAD MESSAGES
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

  friendsList =
    JSON.parse(
      localStorage.getItem(
        `friends_${username}`
      )
    ) || [];

  showView("chatView");

  // SHOW EMPTY SCREEN
  const emptyChat =
    document.getElementById("emptyChat");

  if(emptyChat){
    emptyChat.style.display = "flex";
  }

  // HIDE ACTIVE CHAT
  const activeChat =
    document.getElementById("activeChatBox");

  if(activeChat){
    activeChat.style.display = "none";
  }

  // FRIEND LIST
  const list =
    document.getElementById("friendsList");

  list.innerHTML = "";

  if (friendsList.length === 0) {

    list.innerHTML = `

      <div class="empty-chat-box">

        <h2>No Chats Yet</h2>

        <p>Add friends to start chatting</p>

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
            Active now
          </div>

        </div>

      </div>

    `;

  });

}

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
async function showReels(){

showView("reelsView");

const res =
await fetch(`${API}/api/posts`);

const posts =
await res.json();

const videos =
posts.filter(p => p.video);

const container =
document.getElementById("reelsContainer");

container.innerHTML = videos.map(v => `

<div class="reel-card">

<video
src="${v.video}"
controls
autoplay
loop
class="reel-video"
></video>

<div class="reel-info">

<img
src="${
v.profilePic ||
'https://i.imgur.com/HeIi0wU.png'
}"
class="reel-avatar"
>

<div>

<h3>${v.user}</h3>

<p>${v.text || ""}</p>

</div>

</div>

</div>

`).join("");

}
socket.on("profileUpdated",()=>{

loadPosts();

});

document.getElementById(
"profilePicInput"
)?.addEventListener(
"change",
(e)=>{
  previewProfilePic(e);
  uploadProfilePic(e);
}
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


async function searchUsersMain() {

  const value =
    document.getElementById("mainSearch")
    .value
    .trim();

  const box =
    document.getElementById("searchResults");

  if (!value) {

    box.innerHTML = "";
    box.style.display = "none";

    return;
  }

  box.style.display = "block";

  try {

    const res = await fetch(
      `${API}/api/search-users/${value}`
    );

    const users = await res.json();

    box.innerHTML = "";

    if(users.length === 0){

      box.innerHTML = `
        <div class="search-empty">
          No users found
        </div>
      `;

      return;
    }

    users.forEach(user => {

      const isMe =
        cleanName(user.username)
        ===
        cleanName(username);

      box.innerHTML += `

      <div class="search-user-card">

        <div
          class="search-user-left"
          onclick="${
            isMe
            ?
            `showProfile()`
            :
            `openProfile('${user.username}')`
          }"
        >

          <img
            src="${
              user.profilePic ||
              'https://i.imgur.com/HeIi0wU.png'
            }"
            class="search-avatar"
          >

          <div>

            <div class="search-name">
              ${
                isMe
                ?
                `${user.username} (You)`
                :
                user.username
              }
            </div>

            <small class="search-small-text">
              ${
                isMe
                ?
                "View your profile"
                :
                "FutureBook User"
              }
            </small>

          </div>

        </div>

        ${
          isMe
          ?
          ``
          :
          `
          <button
            onclick="sendRequest('${user.username}')"
            class="search-add-btn"
          >
            Add Friend
          </button>
          `
        }

      </div>

      `;

    });

  }

  catch(err){

    console.log(err);

  }

}
function saveFriend(user){

  let savedFriends =
    JSON.parse(
      localStorage.getItem(
        `friends_${username}`
      )
    ) || [];

  if(!savedFriends.includes(user)){

    savedFriends.push(user);

    localStorage.setItem(
      `friends_${username}`,
      JSON.stringify(savedFriends)
    );

  }

}


document.addEventListener("click", (e) => {

  const box =
    document.getElementById("searchResults");

  const input =
    document.getElementById("mainSearch");

  if(
    box &&
    input &&
    !box.contains(e.target) &&
    !input.contains(e.target)
  ){

    box.style.display = "none";

  }

});

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

async function deletePost(id){

  const sure = confirm(
    "Delete this post?"
  );

  if(!sure) return;

  try{

    await fetch(
      `${API}/api/posts/${id}`,
      {
        method:"DELETE"
      }
    );

    loadPosts();

    showToast("Post deleted");

  }catch(err){

    console.log(err);

  }

}