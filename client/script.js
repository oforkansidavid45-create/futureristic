const socket = io();

let username = prompt("Enter your name:");

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

// receive message
socket.on("receiveMessage", (data) => {
  if (data.user === username) {
    addMessage(data, "sent");
  } else {
    addMessage(data, "received");
  }
});

// display message
function addMessage(data, type) {
  const div = document.createElement("div");
  div.classList.add("message", type);

  div.textContent = `${data.user}: ${data.text}`;

  document.getElementById("messages").appendChild(div);
}