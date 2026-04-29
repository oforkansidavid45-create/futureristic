// =========================
// 👤 USER
// =========================
let username = localStorage.getItem("fb_username");

if (!username) {
  username = prompt("Enter your name:") || "Anonymous";
  localStorage.setItem("fb_username", username);
}

// =========================
// 📝 LOAD POSTS
// =========================
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

loadPosts();

// =========================
// ➕ CREATE POST
// =========================
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