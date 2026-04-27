const socket = io();

// ask for username
let username = prompt("Enter your name:");

function send() {
  const input = document.getElementById("msg");
  const msg = input.value;

  if (msg.trim() === "") return;

  // send username + message
  const fullMessage = {
    user: username,
    text: msg
  };

  socket.emit("sendMessage", fullMessage);

  addMessage(fullMessage, "sent");
  input.value = "";
}

// receive message
socket.on("receiveMessage", (data) => {
  addMessage(data, "received");
});

// display message
function addMessage(data, type) {
  const div = document.createElement("div");
  div.classList.add("message", type);

  div.textContent = `${data.user}: ${data.text}`;

  document.getElementById("messages").appendChild(div);
}