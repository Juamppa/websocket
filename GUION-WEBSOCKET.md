# Guion: Funcionamiento de WebSocket (~3 - 4 min)

## Preparación

- Editor con server.js e index.html.
- Abrir dos ventanas del navegador con la URL pública de **Render** (https://...onrender.com).

---

## 1. Montar WebSocket sobre HTTP (15 - 20 seg)

**Mostrar:** server.js:4 y server.js:21

`js
const { WebSocketServer, WebSocket } = require('ws');
...
const wss = new WebSocketServer({ server });
`

**Decir:**
> "Usamos la librería ws para crear un WebSocketServer. Lo enganchamos al servidor HTTP ya existente, por lo que comparten el mismo puerto y se realiza el upgrade de HTTP a WebSocket."

---

## 2. Conexión de clientes (15 - 20 seg)

**Mostrar:** server.js:31 - 37

`js
wss.on('connection', (socket) => {
  console.log('Cliente conectado. Total:', wss.clients.size);
  broadcast({ type: 'usuarios', total: wss.clients.size });
  ...
});
`

**Decir:**
> "Cada vez que un cliente se conecta, se dispara el evento connection. Ahí obtenemos el socket de esa conexión, el cual nos permite enviarle y recibirle mensajes."

---

## 3. Difundir con roadcast (1 min) - Clave

**Mostrar:** server.js:24 - 29

`js
function broadcast(obj) {
  const data = JSON.stringify(obj);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(data);
  });
}
`

**Decir:**
> "WebSocket no envía objetos, solo texto o binario, por eso convertimos el objeto a JSON con JSON.stringify. Luego recorremos wss.clients y enviamos con client.send() únicamente a aquellos que se encuentren en estado WebSocket.OPEN. Ahí es donde se distribuye el mensaje a todos."

---

## 4. Recibir, validar y retransmitir (1 min)

**Mostrar:** server.js:38 - 48

`js
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
`

**Decir:**
> "El servidor escucha el evento message. Parseamos lo recibido, hacemos una validación mínima y, si es válido, lo retransmitimos a todos con roadcast()."

---

## 5. Cliente: Enviar y recibir (1 min)

**Mostrar:** index.html:134, 146 - 154 y 169 - 176

`js
const ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host);

ws.onmessage = (evento) => {
  const msg = JSON.parse(evento.data);
  if (msg.type === 'mensaje') agregarMensaje(msg);
};

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const texto = inputTexto.value.trim();
  if (!texto || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ nombre: inputNombre.value.trim() || 'Anónimo', texto }));
  inputTexto.value = '';
});
`

**Decir:**
> "Del lado del cliente creamos la conexión con 
ew WebSocket(). Como la página está en HTTPS, automáticamente usará wss://. Con ws.send() enviamos el mensaje al servidor, y con onmessage lo recibimos. Noten que el cliente no dibuja su propio mensaje al enviarlo, lo espera del roadcast del servidor."

---

## Demo (1 min)

1. Abrir dos ventanas en la URL pública de **Render**.
2. Enviar un mensaje desde una de ellas.
3. Observar cómo llega al instante a la otra.

> "Ahí se ve la bidireccionalidad de WebSocket. Todo va al servidor, este valida y retransmite con roadcast(), y todos lo reciben en tiempo real."

---

## Cierre (15 seg)

> "WebSocket mantiene una conexión abierta y bidireccional. El cliente manda JSON, el servidor valida y retransmite con roadcast(), y todos lo ven al instante."
