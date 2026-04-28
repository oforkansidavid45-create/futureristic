const socket = io("https://dave-whatsappmadeasy.onrender.com");

// ask username
let username = prompt("Enter your name:");

// display message
function addMessage(data, type) {
  const div = document.createElement("div");
  div.classList.add("message", type);

  div.textContent = `${data.user}: ${data.text}`;

  const messages = document.getElementById("messages");
  messages.appendChild(div);

  // 👇 ADD THIS HERE
  messages.scrollTop = messages.scrollHeight;
}

// send message
function send() {
  const input = document.getElementById("msg");
  const msg = input.value;

  if (msg.trim() === "") return;

  const fullMessage = {
    user: username,
    text: msg
  };

  socket.emit("sendMessage", fullMessage);

  input.value = "";
}

// receive new messages
socket.on("receiveMessage", (data) => {
  if (data.user === username) {
    addMessage(data, "sent");
  } else {
    addMessage(data, "received");
  }
});

// load chat history
socket.emit("loadMessages");

socket.on("messageHistory", (messages) => {
  messages.forEach((data) => {
    if (data.user === username) {
      addMessage(data, "sent");
    } else {
      addMessage(data, "received");
    }
  });
});
let typingTimeout;

// detect typing
document.getElementById("msg").addEventListener("input", () => {
  socket.emit("typing", username);

  clearTimeout(typingTimeout);

  typingTimeout = setTimeout(() => {
    socket.emit("stopTyping");
  }, 1000);
});

// show typing text
socket.on("showTyping", (name) => {
  let typingDiv = document.getElementById("typing");

  if (!typingDiv) {
    typingDiv = document.createElement("div");
    typingDiv.id = "typing";
    typingDiv.className = "typing";
    document.getElementById("messages").appendChild(typingDiv);
  }

  typingDiv.textContent = `${name} is typing...`;
});

// hide typing text
socket.on("hideTyping", () => {
  const typingDiv = document.getElementById("typing");
  if (typingDiv) typingDiv.remove();
});