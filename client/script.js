const socket = io("https://dave-whatsappmadeasy.onrender.com");

// ask username
let username = prompt("Enter your name:");

// display message
function addMessage(data, type) {
  const div = document.createElement("div");
  div.classList.add("message", type);

  div.textContent = `${data.user}: ${data.text}`;

  document.getElementById("messages").appendChild(div);
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