// =========================
// 👤 USER SETUP
// =========================
let username = localStorage.getItem("fb_username");

if (!username) {
  username = prompt("Enter your name:") || "Anonymous";
  localStorage.setItem("fb_username", username);
}

// =========================
// 📍 ONLINE USERS (FAKE FOR NOW)
// =========================
const onlineUsers = [
  "David",
  "Sarah",
  "John",
  "Amaka",
  "Daniel",
  "Grace"
];

// render users
function renderOnlineUsers() {
  const box = document.getElementById("onlineUsers");

  box.innerHTML = onlineUsers
    .filter(u => u !== username)
    .map(u => `<div class="online-user">🟢 ${u}</div>`)
    .join("");
}

renderOnlineUsers();

// =========================
// 📝 POSTS SYSTEM
// =========================
let posts = JSON.parse(localStorage.getItem("fb_posts")) || [];

function renderPosts() {
  const container = document.getElementById("posts");
  container.innerHTML = "";

  posts.forEach((post, index) => {
    const div = document.createElement("div");
    div.className = "post";

    div.innerHTML = `
      <div class="post-user">${post.user}</div>
      <div class="post-text">${post.text}</div>

      <div class="post-actions">
        <button onclick="likePost(${index})">❤️ ${post.likes}</button>
        <button onclick="deletePost(${index})">🗑</button>
      </div>
    `;

    container.appendChild(div);
  });
}

// =========================
// ➕ CREATE POST
// =========================
function createPost() {
  const input = document.getElementById("postInput");
  const text = input.value.trim();

  if (!text) return;

  const newPost = {
    user: username,
    text,
    likes: 0,
    createdAt: new Date()
  };

  posts.unshift(newPost);
  savePosts();
  renderPosts();

  input.value = "";
}

// =========================
// ❤️ LIKE POST
// =========================
function likePost(index) {
  posts[index].likes++;
  savePosts();
  renderPosts();
}

// =========================
// 🗑 DELETE POST
// =========================
function deletePost(index) {
  posts.splice(index, 1);
  savePosts();
  renderPosts();
}

// =========================
// 💾 SAVE TO STORAGE
// =========================
function savePosts() {
  localStorage.setItem("fb_posts", JSON.stringify(posts));
}

// =========================
// 🚀 INIT
// =========================
renderPosts();
async function loadPosts() {
  const res = await fetch("/api/posts");
  const posts = await res.json();

  const box = document.getElementById("posts");
  box.innerHTML = "";

  posts.forEach(post => {
    const div = document.createElement("div");
    div.className = "post";

    div.innerHTML = `
      <div><b>${post.user}</b></div>
      <div>${post.text}</div>
    `;

    box.appendChild(div);
  });
}
async function createPost() {
  const input = document.getElementById("postInput");
  const text = input.value.trim();

  if (!text) return;

  await fetch("/api/posts", {
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
}

loadPosts();