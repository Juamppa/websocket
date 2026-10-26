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
const { WebSocketServer, WebSocket } = require('ws'); // Extrae de 'ws': WebSocketServer (crea el servidor) y WebSocket (una conexión; se usa para la constante OPEN)

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
> "De `ws` importamos `WebSocketServer`, que crea el servidor, y `WebSocket`, que usamos solo para la constante `OPEN`. En vez de levantar un servidor WebSocket aparte, le pasamos nuestro servidor HTTP, así comparten el mismo puerto. Cuando un cliente se conecta ocurre el *HTTP Upgrade*: la petición HTTP se transforma en una conexión WebSocket persistente y bidireccional."

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

## 2.5 Heartbeat: detectar clientes caídos (15 - 20 seg)
**Mostrar:** `server.js:32-33` y `server.js:56-65`

```js
socket.vivo = true;                                  // Al conectar, marcamos el socket como vivo
socket.on('pong', () => { socket.vivo = true; });    // Si responde al ping, sigue vivo

const intervaloPing = setInterval(() => {            // Cada 30 segundos...
  wss.clients.forEach((client) => {                  // Recorre todos los clientes
    if (!client.vivo) return client.terminate();     // Si no respondió al ping anterior, lo desconecta
    client.vivo = false;                             // Lo marca como "sin responder"
    client.ping();                                   // Le envía un ping
  });
}, 30000);                                           // Cada 30.000 ms = 30 segundos

wss.on('close', () => clearInterval(intervaloPing)); // Al cerrar el servidor, corta el intervalo
```

**Decir:**
> "Un problema real de WebSocket es detectar clientes que se desconectaron sin avisar, por ejemplo por mala conexión: el servidor los sigue contando como conectados. Para eso está el *heartbeat*: cada 30 segundos el servidor envía un `ping` a cada cliente. Si el cliente está vivo, el protocolo responde automáticamente con un `pong` y lo volvemos a marcar como vivo. Si no responde, lo cerramos con `terminate()`. Así el contador de usuarios se mantiene correcto. Ojo: esto es una técnica de la aplicación, no parte del protocolo WebSocket."

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

> **Truco para la demo:** podés mostrar que en local la URL es `ws://localhost:3000` y, al desplegar en Render, la misma línea genera `wss://...` porque la página pasa a ser `https://`. No hay que configurar nada aparte.

```js
const ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host); // Abre la conexión al mismo host; usa wss:// si la página es https (Render) y ws:// si es http (local)

ws.onmessage = (evento) => {                                // Escucha mensajes que envía el servidor
  const msg = JSON.parse(evento.data);                     // Convierte JSON recibido a objeto
  if (msg.type === 'usuarios') {                           // Si el servidor avisa cuántos hay conectados
    total = msg.total;                                     // Guarda el total de personas conectadas
    estado.textContent = total + (total === 1 ? ' persona conectada' : ' personas conectadas'); // Muestra "1 persona" o "N personas"
  } else if (msg.type === 'mensaje') {                     // Si es un mensaje de chat
    agregarMensaje(msg);                                   // Dibuja la burbuja en pantalla
  }
};

form.addEventListener('submit', (e) => {                   // Al enviar el formulario
  e.preventDefault();                                      // Evita recarga de página
  const texto = inputTexto.value.trim();                   // Toma texto sin espacios
  if (!texto || ws.readyState !== WebSocket.OPEN) return; // No envía si vacío o no conectado
  ws.send(JSON.stringify({ nombre: inputNombre.value.trim() || 'Anónimo', texto })); // Arma objeto, lo pasa a JSON y lo envía al servidor por la conexión
  inputTexto.value = '';                                   // Limpia el input
});
```

**Decir:**
> "El navegador cuenta con la clase `WebSocket` nativa. Con `new WebSocket(...)` abrimos la conexión hacia el **mismo host** que sirvió la página (`location.host`). Fijate en el detalle del protocolo: si la página es `http://` usa `ws://`, y si es `https://` usa `wss://` automáticamente. Por eso la misma línea funciona en local y en producción (Render), sin cambiar nada. Con `ws.send()` enviamos el mensaje al servidor, y con `ws.onmessage` escuchamos lo que el servidor nos envía de vuelta. Ese `onmessage` recibe texto JSON, lo pasa a objeto con `JSON.parse` y, según `msg.type`, hace una de dos cosas: si es `usuarios` actualiza el contador de personas conectadas; si es `mensaje` dibuja la burbuja con `agregarMensaje()`. Para enviar es al revés: armamos un objeto con el nombre y el texto, lo convertimos a JSON con `JSON.stringify` y lo mandamos con `ws.send()`. WebSocket no transporta objetos, solo texto, por eso esa conversión; el servidor después lo vuelve a objeto con `JSON.parse`. Un detalle clave: el cliente no muestra su propio mensaje al enviarlo, espera recibirlo desde el `broadcast()` del servidor. Eso demuestra que todo el tráfico pasa por el servidor a través de la conexión WebSocket."

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
