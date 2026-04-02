let longLast = 0;
function poll() {
  fetch(`http://localhost:5500/poll?last=${longLast}`)
    .then(res => res.json())
    .then(data => {
      longLast = data.count;
      data.messages.forEach(msg => {
        document.getElementById('long').innerHTML += `<div>${msg}</div>`;
      });
      poll(); // call again
    });
}
poll();
