// =========================
// 👤 USER
// =========================
let username = localStorage.getItem("fb_username");

if (!username) {
  username = prompt("Enter your name:") || "Anonymous";
  localStorage.setItem("fb_username", username);
}

// =========================
// 🚀 LOAD POSTS FROM SERVER
// =========================
async function loadPosts() {
  try {
    const res = await fetch("/api/posts");
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
    console.log("Error loading posts:", err);
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

  } catch (err) {
    console.log("Error creating post:", err);
  }
}

// =========================
// 🟢 ONLINE USERS (FAKE UI FOR NOW)
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