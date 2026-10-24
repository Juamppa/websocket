# Guion para presentación: WebSocket (3 - 4 minutos)

## 0. ¿Por qué usar una librería? (15 - 20 seg)
**Mostrar:** `package.json` y terminal

```json
"dependencies": {
  "ws": "^8.18.0"
}
```

```bash
npm install
```

**Decir:**
> "El navegador ya trae la API `WebSocket` nativa, pero Node.js no tiene un servidor WebSocket integrado. Por eso usamos la librería `ws`. Al ejecutar `npm install`, se descargan las dependencias desde `package.json` y se guardan en `node_modules/`. Luego, con `require('ws')` podemos usarla en nuestro servidor."

---

## 1. Montar WebSocket sobre HTTP (15 - 20 seg)
**Mostrar:** `server.js:1-4` y `server.js:20-21`

```js
const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');

const server = http.createServer((req, res) => { ... });
const wss = new WebSocketServer({ server });
```

**Decir:**
> "Creamos un servidor HTTP con Node.js y, en lugar de levantar un servidor WebSocket independiente, pasamos ese mismo servidor a `WebSocketServer`. Esto permite que ambas conexiones compartan el mismo puerto. Cuando un cliente intenta establecer una conexión WebSocket, ocurre el *HTTP Upgrade*: la petición HTTP se transforma en una conexión WebSocket persistente y bidireccional."

---

## 2. Conexión de clientes (10 - 15 seg)
**Mostrar:** `server.js:31-37`

```js
wss.on('connection', (socket) => {
  console.log('Cliente conectado. Total:', wss.clients.size);
  broadcast({ type: 'usuarios', total: wss.clients.size });
  ...
});
```

**Decir:**
> "Una vez hecho el *upgrade*, el servidor emite el evento `connection`. Recibimos un objeto `socket` que representa esa conexión individual. Ese `socket` es el canal directo entre servidor y ese cliente, y es con el que podremos enviarle o recibirle mensajes."

---

## 3. Broadcast: enviar a todos los clientes (25 - 40 seg) - Clave
**Mostrar:** `server.js:23-29`

```js
function broadcast(obj) {
  const data = JSON.stringify(obj);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(data);
  });
}
```

**Decir:**
> "WebSocket solo transmite texto o datos binarios, no objetos JavaScript. Por eso convertimos el objeto a JSON con `JSON.stringify`. Luego recorremos `wss.clients`, que contiene todos los sockets activos, y con `client.send(data)` enviamos el mensaje únicamente a los que tengan `readyState === WebSocket.OPEN`. Ahí es donde ocurre la retransmisión a todos los clientes conectados."

---

## 4. Recibir, validar y retransmitir (30 - 40 seg)
**Mostrar:** `server.js:38-48`

```js
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
```

**Decir:**
> "Cada `socket` escucha el evento `message`. Parseamos los datos recibidos, aplicamos una validación mínima para sanitizar el mensaje y, si es válido, lo retransmitimos a todos los clientes mediante `broadcast()`."

---

## 5. Cliente: conexión, envío y recepción (40 - 55 seg)
**Mostrar:** `index.html:134`, `index.html:146-154` y `index.html:169-176`

```js
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
```

**Decir:**
> "El navegador cuenta con la clase `WebSocket` nativa. Creamos la conexión usando `ws://` o `wss://` según el protocolo. Con `ws.send()` enviamos el mensaje al servidor, y con `ws.onmessage` escuchamos lo que el servidor nos envía de vuelta. Un detalle clave: el cliente no muestra su propio mensaje al enviarlo, espera recibirlo desde el `broadcast()` del servidor. Eso demuestra que todo el tráfico pasa por el servidor a través de la conexión WebSocket."

---

## Demo y Cierre (20 - 30 seg)
1. Ejecutar `npm install` (en caso de no tener `node_modules`)
2. Ejecutar `npm start`
3. Abrir dos ventanas del mismo sitio
4. Enviar un mensaje desde una y mostrar que llega al instante a la otra

**Decir:**
> "Ahí vemos la gran diferencia con HTTP: en lugar de hacer peticiones y respuestas, tenemos una conexión abierta, persistente y bidireccional. El cliente envía por WebSocket, el servidor valida y retransmite con `broadcast()`, y todos los clientes reciben ese mensaje en tiempo real."

---

## Notas para la presentación
- **Enfócate en WebSocket:** El *heartbeat* (`ping/pong`), estilos o detalles de UI son parte del demo, no del protocolo. No es necesario entrar a fondo en ellos.
- **Explica `npm install`:** Es importante mostrar por qué necesitamos la librería `ws` en Node.js y por qué el navegador no la necesita.
- **Resalta el *upgrade*:** Es la transición clave entre HTTP y WebSocket.
- **Usa el vocabulario correcto:** Habla de "socket", "conexión persistente", "bidireccional", "broadcast" y "upgrade".
