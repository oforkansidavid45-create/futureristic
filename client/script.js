const socket = io();

// ask for username
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

  // send to server ONLY
  socket.emit("sendMessage", fullMessage);

  input.value = "";
}

// receive message (THIS handles display for ALL tabs)
socket.on("receiveMessage", (data) => {
  addMessage(data);
});

// display message
function addMessage(data) {
  const div = document.createElement("div");
  div.classList.add("message");

  div.textContent = `${data.user}: ${data.text}`;

  document.getElementById("messages").appendChild(div);
}