console.log("🔥 script.js loaded");

// =========================
// 👤 USER
// =========================
let username = localStorage.getItem("fb_username");

if (!username || username === "null") {
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

        <button onclick="commentPost('${post._id}')">
          💬 Comment
        </button>

        <div class="comments">
          ${(post.comments || []).map(c =>
            `<div><b>${c.user}:</b> ${c.text}</div>`
          ).join("")}
        </div>
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

    await res.json();

    input.value = "";
    loadPosts();

  } catch (err) {
    console.log("❌ Error creating post:", err);
  }
}

// =========================
// ❤️ LIKE POST
// =========================
async function likePost(id) {
  try {
    const res = await fetch(`${API}/api/posts/like/${id}`, {
      method: "PUT"
    });

    if (!res.ok) throw new Error("Like failed");

    loadPosts();

  } catch (err) {
    console.log("❌ Error liking post:", err);
  }
}

// =========================
// 💬 COMMENT POST (NEW FEATURE)
// =========================
async function commentPost(id) {
  const text = prompt("Write your comment:");

  if (!text) return;

  try {
    const res = await fetch(`${API}/api/posts/comment/${id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        user: username,
        text
      })
    });

    if (!res.ok) throw new Error("Comment failed");

    loadPosts();

  } catch (err) {
    console.log("❌ Error commenting:", err);
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