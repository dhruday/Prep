
const source = new EventSource('http://localhost:5500/sse');
source.onmessage = e => {
  document.getElementById('sse').innerHTML += `<div>${e.data}</div>`;
};