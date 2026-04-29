console.log("🔥 script.js loaded");

// =========================
// 👤 USER
// =========================
let username = localStorage.getItem("fb_username");

if (!username) {
  username = prompt("Enter your name:") || "Anonymous";
  localStorage.setItem("fb_username", username);
}

console.log("👤 Username:", username);

// =========================
// 🌐 API URL
// =========================
const API = "https://futureristic.onrender.com";

// =========================
// 🚀 LOAD POSTS
// =========================
async function loadPosts() {
  try {
    const res = await fetch(`${API}/api/posts`);

    if (!res.ok) throw new Error("Failed to fetch posts");

    const posts = await res.json();

    const box = document.getElementById("posts");
    if (!box) return;

    box.innerHTML = "";

    posts.forEach(post => {
      const div = document.createElement("div");
      div.className = "post";

      div.innerHTML = `
        <div class="post-user">${post.user}</div>
        <div class="post-text">${post.text}</div>

        <button onclick="likePost('${post._id}')">
          ❤️ ${post.likes || 0}
        </button>
      `;

      box.appendChild(div);
    });

  } catch (err) {
    console.log("❌ Error loading posts:", err);
  }
}

// =========================
// ➕ CREATE POST
// =========================
async function createPost() {
  const input = document.getElementById("postInput");
  if (!input) return;

  const text = input.value.trim();
  if (!text) return;

  console.log("🚀 Sending post:", username, text);

  try {
    const res = await fetch(`${API}/api/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        user: username,
        text
      })
    });

    if (!res.ok) throw new Error("Failed to create post");

    const data = await res.json();
    console.log("✅ Post saved:", data);

    input.value = "";
    loadPosts();

  } catch (err) {
    console.log("❌ Error creating post:", err);
  }
}

// =========================
// ❤️ LIKE POST (NEW)
// =========================
async function likePost(id) {
  try {
    await fetch(`${API}/api/posts/like/${id}`, {
      method: "PUT"
    });

    loadPosts();

  } catch (err) {
    console.log("❌ Error liking post:", err);
  }
}

// =========================
// 🟢 ONLINE USERS
// =========================
const onlineUsers = ["David", "Sarah", "John", "Amaka"];

function renderOnlineUsers() {
  const box = document.getElementById("onlineUsers");
  if (!box) return;

  box.innerHTML = onlineUsers
    .filter(u => u !== username)
    .map(u => `<div class="online-user">🟢 ${u}</div>`)
    .join("");
}

// =========================
// INIT
// =========================
window.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 DOM ready");

  renderOnlineUsers();
  loadPosts();
});