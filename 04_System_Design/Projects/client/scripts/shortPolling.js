
let shortLast = 0;
setInterval(() => {
  fetch(`http://localhost:5500/poll?last=${shortLast}`)
    .then(res => res.json())
    .then(data => {
      shortLast = data.count;
      data.messages.forEach(msg => {
        document.getElementById('short').innerHTML += `<div>${msg}</div>`;
      });
    });
}, 3000);