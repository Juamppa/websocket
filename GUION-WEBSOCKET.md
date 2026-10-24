# Guion para presentación: WebSocket (3 - 4 minutos)

## 0. ¿Por qué usar una librería? (15 - 20 seg)
**Mostrar:** `package.json` y terminal

```json
"dependencies": {        // Sección donde se declaran las dependencias del proyecto
  "ws": "^8.18.0"        // Librería "ws" versión ^8.18.0, necesaria para crear servidor WebSocket en Node.js
}
```

```bash
npm install             // Descarga todas las dependencias de package.json a node_modules/
```

**Decir:**
> "El navegador ya trae la API `WebSocket` nativa, pero Node.js no tiene un servidor WebSocket integrado. Por eso usamos la librería `ws`. Al ejecutar `npm install`, se descargan las dependencias desde `package.json` y se guardan en `node_modules/`. Luego, con `require('ws')` podemos usarla en nuestro servidor."

---

## 1. Montar WebSocket sobre HTTP (15 - 20 seg)
**Mostrar:** `server.js:1-4` y `server.js:20-21`

```js
const http = require('http');                        // Módulo nativo para crear servidor HTTP
const fs = require('fs');                            // Módulo nativo para leer archivos del disco
const path = require('path');                        // Módulo nativo para manejar rutas de archivos
const { WebSocketServer, WebSocket } = require('ws'); // Extrae WebSocketServer y WebSocket de la librería ws

const server = http.createServer((req, res) => {    // Crea servidor HTTP que servirá index.html
  fs.readFile(path.join(__dirname, 'index.html'), (err, data) => { // Lee el archivo index.html
    if (err) { res.writeHead(500); return res.end('No se pudo cargar index.html'); } // Error si no lo encuentra
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); // Respuesta exitosa con HTML
    res.end(data); // Envía el archivo al cliente
  });
});

const wss = new WebSocketServer({ server });        // Monta el servidor WebSocket sobre el servidor HTTP (HTTP Upgrade)
```

**Decir:**
> "Creamos un servidor HTTP con Node.js y, en lugar de levantar un servidor WebSocket independiente, pasamos ese mismo servidor a `WebSocketServer`. Esto permite que ambas conexiones compartan el mismo puerto. Cuando un cliente intenta establecer una conexión WebSocket, ocurre el *HTTP Upgrade*: la petición HTTP se transforma en una conexión WebSocket persistente y bidireccional."

---

## 2. Conexión de clientes (10 - 15 seg)
**Mostrar:** `server.js:31-37`

```js
wss.on('connection', (socket) => {                              // Se ejecuta cuando un cliente completa el HTTP Upgrade
  socket.vivo = true;                                           // Marca el socket como vivo para el heartbeat
  socket.on('pong', () => { socket.vivo = true; });             // Al recibir pong, vuelve a marcarlo como vivo

  console.log('Cliente conectado. Total:', wss.clients.size);   // Muestra cantidad de clientes conectados
  broadcast({ type: 'usuarios', total: wss.clients.size });     // Notifica a TODOS los clientes el nuevo total
});
```

**Decir:**
> "Una vez hecho el *upgrade*, el servidor emite el evento `connection`. Recibimos un objeto `socket` que representa esa conexión individual. Ese `socket` es el canal directo entre servidor y ese cliente, y es con el que podremos enviarle o recibirle mensajes."

---

## 3. Broadcast: enviar a todos los clientes (25 - 40 seg) - Clave
**Mostrar:** `server.js:23-29`

```js
function broadcast(obj) {                                    // Función para enviar un objeto a todos los clientes
  const data = JSON.stringify(obj);                         // Convierte objeto JS a string JSON (WebSocket solo envía texto/binario)
  wss.clients.forEach((client) => {                         // Recorre TODOS los sockets conectados
    if (client.readyState === WebSocket.OPEN) client.send(data); // Envía solo si la conexión sigue abierta
  });
}
```

**Decir:**
> "WebSocket solo transmite texto o datos binarios, no objetos JavaScript. Por eso convertimos el objeto a JSON con `JSON.stringify`. Luego recorremos `wss.clients`, que contiene todos los sockets activos, y con `client.send(data)` enviamos el mensaje únicamente a los que tengan `readyState === WebSocket.OPEN`. Ahí es donde ocurre la retransmisión a todos los clientes conectados."

---

## 4. Recibir, validar y retransmitir (30 - 40 seg)
**Mostrar:** `server.js:38-48`

```js
socket.on('message', (raw) => {                             // Escucha mensajes que envía ESTE cliente
  try {
    const msg = JSON.parse(raw);                            // Convierte el string JSON recibido a objeto JS
    const nombre = String(msg.nombre || 'Anónimo').slice(0, 20); // Sanea nombre (máx 20 caracteres)
    const texto = String(msg.texto || '').slice(0, 500);        // Sanea texto (máx 500 caracteres)
    if (!texto.trim()) return;                              // Ignora mensajes vacíos o con solo espacios
    broadcast({ type: 'mensaje', nombre, texto, hora: new Date().toISOString() }); // Retransmite a todos
  } catch (e) {
    console.error('Mensaje inválido:', e.message);          // Si no es JSON válido, lo ignora y logea error
  }
});
```

**Decir:**
> "Cada `socket` escucha el evento `message`. Parseamos los datos recibidos, aplicamos una validación mínima para sanitizar el mensaje y, si es válido, lo retransmitimos a todos los clientes mediante `broadcast()`."

---

## 5. Cliente: conexión, envío y recepción (40 - 55 seg)
**Mostrar:** `index.html:134`, `index.html:146-154` y `index.html:169-176`

```js
const ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host); // Conexión WebSocket nativa (ws/wss según protocolo)

ws.onmessage = (evento) => {                                // Escucha mensajes que envía el servidor
  const msg = JSON.parse(evento.data);                     // Convierte JSON recibido a objeto
  if (msg.type === 'mensaje') agregarMensaje(msg);         // Muestra solo mensajes de tipo 'mensaje'
};

form.addEventListener('submit', (e) => {                   // Al enviar el formulario
  e.preventDefault();                                      // Evita recarga de página
  const texto = inputTexto.value.trim();                   // Toma texto sin espacios
  if (!texto || ws.readyState !== WebSocket.OPEN) return; // No envía si vacío o no conectado
  ws.send(JSON.stringify({ nombre: inputNombre.value.trim() || 'Anónimo', texto })); // Envía JSON al servidor
  inputTexto.value = '';                                   // Limpia el input
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
