const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer, WebSocket } = require('ws');

const PORT = process.env.PORT || 3000;

// Servidor HTTP: solo entrega la página del chat
const server = http.createServer((req, res) => {
  fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
    if (err) {
      res.writeHead(500);
      return res.end('No se pudo cargar index.html');
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(data);
  });
});

// Servidor WebSocket montado sobre el mismo servidor HTTP
const wss = new WebSocketServer({ server });

// Envía un objeto a todos los clientes conectados
function broadcast(obj) {
  const data = JSON.stringify(obj);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(data);
  });
}

wss.on('connection', (socket) => {
  console.log('Cliente conectado. Total:', wss.clients.size);
  broadcast({ type: 'usuarios', total: wss.clients.size });

  socket.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      const nombre = String(msg.nombre || 'Anónimo').slice(0, 20);
      const texto = String(msg.texto || '').slice(0, 500);
      if (!texto.trim()) return;
      broadcast({ type: 'mensaje', nombre, texto, hora: new Date().toISOString() });
    } catch (e) {
      console.error('Mensaje inválido:', e.message);
    }
  });

  socket.on('close', () => {
    console.log('Cliente desconectado. Total:', wss.clients.size);
    broadcast({ type: 'usuarios', total: wss.clients.size });
  });
});

server.listen(PORT, () => {
  console.log(`Chat funcionando en http://localhost:${PORT}`);
});
