const ws = new WebSocket('ws://localhost:5500');
ws.onmessage = (event) => {
  document.getElementById('ws').innerHTML += `<div>${event.data}</div>`;
};