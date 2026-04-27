const socket = io();

function send() {
  const input = document.getElementById("msg");
  const msg = input.value;

  if (msg.trim() === "") return;

  socket.emit("sendMessage", msg);

  addMessage(msg, "sent");
  input.value = "";
}

socket.on("receiveMessage", (msg) => {
  addMessage(msg, "received");
});

function addMessage(msg, type) {
  const div = document.createElement("div");
  div.classList.add("message", type);
  div.textContent = msg;

  document.getElementById("messages").appendChild(div);
}