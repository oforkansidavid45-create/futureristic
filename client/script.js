// =========================
// 👤 USER
// =========================
let username = localStorage.getItem("fb_username");

if (!username) {
  username = prompt("Enter your name:") || "Anonymous";
  localStorage.setItem("fb_username", username);
}

// 👉 IMPORTANT: force correct API URL (prevents Render issues)
const API = window.location.origin;

// =========================
// 🚀 LOAD POSTS FROM SERVER
// =========================
async function loadPosts() {
  try {
    const res = await fetch(`${API}/api/posts`);

    if (!res.ok) {
      throw new Error("Failed to fetch posts");
    }

    const posts = await res.json();

    const box = document.getElementById("posts");
    box.innerHTML = "";

    posts.forEach(post => {
      const div = document.createElement("div");
      div.className = "post";

      div.innerHTML = `
        <div class="post-user">${post.user}</div>
        <div class="post-text">${post.text}</div>
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
  const text = input.value.trim();

  if (!text) return;

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

    if (!res.ok) {
      throw new Error("Failed to create post");
    }

    const data = await res.json();
    console.log("✅ Post saved:", data);

    input.value = "";
    loadPosts();

  } catch (err) {
    console.log("❌ Error creating post:", err);
  }
}

// =========================
// 🟢 ONLINE USERS (FAKE UI)
// =========================
const onlineUsers = ["David", "Sarah", "John", "Amaka"];

function renderOnlineUsers() {
  const box = document.getElementById("onlineUsers");

  box.innerHTML = onlineUsers
    .filter(u => u !== username)
    .map(u => `<div class="online-user">🟢 ${u}</div>`)
    .join("");
}

// =========================
// INIT
// =========================
renderOnlineUsers();
loadPosts();