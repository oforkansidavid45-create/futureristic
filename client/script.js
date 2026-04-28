const socket = io("https://dave-whatsappmadeasy.onrender.com");

// =========================
// WAIT FOR DOM (IMPORTANT FIX)
// =========================
window.addEventListener("DOMContentLoaded", () => {

  // =========================
  // USER
  // =========================
  let username = prompt("Enter your name:") || "Anonymous";
  socket.emit("join", username);

  // =========================
  // STATE
  // =========================
  let currentChatUser = null;
  let currentRoom = null;
  let typingTimeout;

  const messagesBox = document.getElementById("messages");
  const input = document.getElementById("msg");
  const typingDiv = document.getElementById("typing");
  const onlineBox = document.getElementById("onlineUsers");

  // =========================
  // ROOM ID
  // =========================
  function getRoomId(a, b) {
    return [a, b].sort().join("-");
  }

  // =========================
  // OPEN CHAT
  // =========================
  window.openChat = function(user) {
    currentChatUser = user;
    currentRoom = getRoomId(username, user);

    messagesBox.innerHTML = "";
    document.querySelector(".chat-header").innerText = "Chat with " + user;

    socket.emit("joinRoom", currentRoom);
    socket.emit("loadRoomMessages", currentRoom);
  };

  // =========================
  // RENDER MESSAGE
  // =========================
  function addMessage(data) {
    const div = document.createElement("div");
    div.className = "message " + (data.user === username ? "sent" : "received");

    let ticks = "";

    if (data.user === username) {
      if (data.status === "sent") ticks = " ✔";
      if (data.status === "delivered") ticks = " ✔✔";
      if (data.status === "read") ticks = " ✔✔✔";
    }

    div.innerHTML = `
      <div class="bubble">
        <div class="text">${data.text}</div>
        <div class="meta">${ticks}</div>
      </div>
    `;

    messagesBox.appendChild(div);
    messagesBox.scrollTop = messagesBox.scrollHeight;
  }

  // =========================
  // SEND MESSAGE
  // =========================
  window.send = function() {
    const text = input.value.trim();

    if (!text || !currentChatUser) return;

    socket.emit("sendPrivateMessage", {
      from: username,
      to: currentChatUser,
      text
    });

    input.value = "";
  };

  // =========================
  // ENTER KEY SEND (NEW)
  // =========================
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      send();
    }
  });

  // =========================
  // RECEIVE MESSAGE (FIXED)
  // =========================
  socket.on("receivePrivateMessage", (data) => {
    if (!currentRoom || data.roomId !== currentRoom) return;
    addMessage(data);
  });

  // =========================
  // LOAD HISTORY
  // =========================
  socket.on("roomMessages", (messages) => {
    messagesBox.innerHTML = "";
    messages.forEach(addMessage);
  });

  // =========================
  // TYPING
  // =========================
  input.addEventListener("input", () => {
    if (!currentChatUser) return;

    socket.emit("typing", username);

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      socket.emit("stopTyping");
    }, 800);
  });

  // =========================
  // TYPING UI
  // =========================
  socket.on("showTyping", (name) => {
    if (name !== currentChatUser) return;
    typingDiv.innerText = `${name} is typing...`;
  });

  socket.on("hideTyping", () => {
    typingDiv.innerText = "";
  });

  // =========================
  // ONLINE USERS (SAFE CLICK)
  // =========================
  socket.on("updateOnlineUsers", (users) => {
    onlineBox.innerHTML = "";

    users
      .filter(u => u !== username)
      .forEach(u => {
        const div = document.createElement("div");
        div.className = "user";
        div.innerText = u;
        div.onclick = () => openChat(u);
        onlineBox.appendChild(div);
      });
  });

});