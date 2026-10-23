# Guion corto: Chat con WebSocket (~10 min)

> Mostrar poco código, el justo. Para cada bloque: qué proyectar y qué decir.

---

## Preparación

- Editor con `server.js`, `index.html` y `package.json`.
- `npm start` ya corriendo.
- Dos ventanas del navegador en `http://localhost:3000`.

> Si exponés desde Render, abrí la URL pública (`https://...onrender.com`) en las dos ventanas y omití mostrar `npm start`.

---

## 0. De dónde sale `ws` (1-2 min, antes del código)

**Mostrar:** `package.json` (líneas 6-11)

```json
{
  "scripts": { "start": "node server.js" },
  "dependencies": { "ws": "^8.18.0" }
}
```

- `"start": "node server.js"`: el comando que arranca la app.
- `"ws": "^8.18.0"`: **declara** la dependencia, pero no la incluye en el proyecto.

**Decir:**
> "Node no trae un servidor WebSocket listo para usar, así que usamos una librería: `ws`. En `package.json` solo **declaramos** la dependencia. No está incluida en el proyecto."

**Cómo se descarga:**
1. `npm install` lee `package.json`.
2. Busca `ws` en el registro de npm (`registry.npmjs.org`).
3. La descarga en la carpeta `node_modules/`.
4. `package-lock.json` guarda la versión exacta para que a todos les baje lo mismo.
5. `node_modules` **no se sube a git**; se regenera con `npm install`.

**Cómo se usa:** `server.js:4`

```js
const { WebSocketServer, WebSocket } = require('ws');
// require('ws'): carga la librería desde node_modules
// WebSocketServer: clase para crear el servidor WebSocket
// WebSocket: clase con las constantes de estado (OPEN, CLOSED, etc.)
```

> "`require('ws')` busca la librería en `node_modules` y nos da las dos clases que usamos: `WebSocketServer` para el servidor y `WebSocket` para comparar el estado `OPEN`."

**Si preguntan "¿y si no la tengo?"**
> "Se ejecuta `npm install` y listo. Por eso el proyecto se comparte sin `node_modules`: cada uno la descarga."

**Opcional para la demo:** mostrar la carpeta `node_modules/ws` abierta un segundo y volver. No leer su código.

---

## 1. Qué es WebSocket (30 s, sin código)

**Decir:**
> "HTTP es mandar una carta: pedís y se cierra. WebSocket es una llamada: la conexión queda abierta y los dos hablan cuando quieran. Eso necesita un chat."

---

## 2. Servidor: montar WebSocket (1 min)

**Mostrar:** `server.js:21`

```js
const wss = new WebSocketServer({ server });
// new WebSocketServer: crea el servidor WebSocket
// { server }: lo engancha al servidor HTTP que ya existe (mismo puerto)
// wss: instancia que agrupa los clientes y los eventos
```

**Decir:**
> "El servidor HTTP entrega la página. En la línea 21 le enganchamos el WebSocket **al mismo servidor**, así comparten el puerto 3000. El navegador pide el upgrade, el servidor responde `101` y la conexión pasa a WebSocket."

---

## 3. Servidor: `broadcast` (2 min) — lo más importante

**Mostrar:** `server.js:24-29`

```js
function broadcast(obj) {                     // recibe el objeto a difundir
  const data = JSON.stringify(obj);           // objeto → texto JSON (WebSocket no manda objetos)
  wss.clients.forEach((client) => {           // recorre todos los clientes conectados
    if (client.readyState === WebSocket.OPEN) // solo si la conexión sigue abierta
      client.send(data);                      // envía el mismo texto a ese cliente
  });
}
```

**Decir:**
> "Convierte el objeto a texto porque WebSocket no manda objetos, y se lo envía a todos los conectados. `readyState === OPEN` evita enviar a alguien que ya se está desconectando."

---

## 4. Servidor: eventos (1 min)

**Mostrar:** `server.js:31-54` (sin leer todo)

```js
wss.on('connection', (socket) => {                  // se dispara cuando entra un cliente
  socket.vivo = true;                               // lo marca como vivo (para el heartbeat)
  socket.on('pong', () => { socket.vivo = true; }); // si responde el ping, sigue vivo

  console.log('Cliente conectado. Total:', wss.clients.size); // log en la terminal
  broadcast({ type: 'usuarios', total: wss.clients.size });   // avisa el nuevo total a todos

  socket.on('message', (raw) => { /* valida y retransmite */ }); // mensaje entrante
  socket.on('close', () => {                                   // el cliente se fue
    broadcast({ type: 'usuarios', total: wss.clients.size });  // actualiza el contador
  });
});
```

**Decir:**
> "Tres eventos: `connection` avisa cuántos hay; `message` recibe, valida y retransmite; `close` actualiza el contador cuando alguien se va."

Destacar solo esto de `message` (`server.js:38-48`):

```js
socket.on('message', (raw) => {                                  // llega el mensaje del cliente
  try {
    const msg = JSON.parse(raw);                                 // texto JSON → objeto
    const nombre = String(msg.nombre || 'Anónimo').slice(0, 20); // nombre o "Anónimo", máximo 20
    const texto = String(msg.texto || '').slice(0, 500);         // texto, máximo 500 caracteres
    if (!texto.trim()) return;                                   // ignora mensajes vacíos
    broadcast({ type: 'mensaje', nombre, texto, hora: new Date().toISOString() }); // retransmite
  } catch (e) {
    console.error('Mensaje inválido:', e.message);               // JSON inválido: no rompe el server
  }
});
```

> "Llega texto, lo pasamos a objeto, limitamos el largo y retransmitimos. El `try/catch` evita que un JSON inválido tumbe el servidor."

**Extra que puede aparecer en pantalla:** heartbeat (`server.js:56-65`)

```js
const intervaloPing = setInterval(() => {          // cada 30 segundos
  wss.clients.forEach((client) => {                // recorre los conectados
    if (!client.vivo) return client.terminate();   // no respondió: lo corta
    client.vivo = false;                           // lo marca como "sin responder"
    client.ping();                                 // le manda un ping
  });
}, 30000);
```

> "Sirve para detectar clientes que se cayeron sin cerrar bien: si no responden al ping, se los corta y el contador se actualiza."

---

## 5. Cliente: conectar y escuchar (1 min)

**Mostrar:** `index.html:134` y `146-154`

```js
const ws = new WebSocket(
  (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host
);
// location.protocol: 'https:' si la página es segura, 'http:' si no
// ? wss:// : ws://   → cifrado si la página es HTTPS
// location.host: mismo host y puerto que sirvió la página
```

```js
ws.onmessage = (evento) => {           // se dispara con cada mensaje del servidor
  const msg = JSON.parse(evento.data); // texto JSON → objeto
  if (msg.type === 'usuarios') {       // ¿es el contador de conectados?
    total = msg.total;
    estado.textContent = total + (total === 1 ? ' persona conectada' : ' personas conectadas');
  } else if (msg.type === 'mensaje') { // ¿es un mensaje de chat?
    agregarMensaje(msg);               // lo dibuja en pantalla
  }
};
```

**Decir:**
> "`wss://` es cifrado y `ws://` sin cifrar; elegimos según si la página es HTTPS. `location.host` usa el mismo servidor de la página. En `onmessage` llega texto, lo parseamos y el campo `type` dice qué hacer: contador o mensaje."

---

## 6. Cliente: enviar (1 min)

**Mostrar:** `index.html:169-176`

```js
form.addEventListener('submit', (e) => {                  // al enviar el formulario
  e.preventDefault();                                     // evita recargar la página
  const texto = inputTexto.value.trim();                  // texto sin espacios sobrantes
  if (!texto || ws.readyState !== WebSocket.OPEN) return; // nada vacío y conexión abierta
  ws.send(JSON.stringify({                                // objeto → texto JSON
    nombre: inputNombre.value.trim() || 'Anónimo',
    texto
  }));                                                    // lo manda al servidor
  inputTexto.value = '';                                  // limpia el campo
  inputTexto.focus();                                     // deja el cursor listo
});
```

**Decir:**
> "Siempre verificamos que la conexión esté abierta antes de enviar. El cliente no dibuja su propio mensaje: lo manda y espera que el servidor se lo devuelva a todos."

---

## 7. Flujo en una frase (30 s)

> "Cliente envía JSON → servidor valida → `broadcast` → todos reciben en `onmessage` → se dibuja."

---

## 8. Demo (2-3 min)

1. Mostrar `npm start`.
2. Abrir dos ventanas: contador en **2 conectadas**.
3. Enviar de una a otra: aparece al instante.
4. Cerrar una: el contador baja.
5. Mostrar en la terminal las conexiones/desconexiones.

> "Sin recargar, sin pedir cada segundo. La conexión ya está abierta."

---

## 9. Cierre (30 s)

> "WebSocket mantiene una conexión abierta y bidireccional. El cliente manda JSON, el servidor valida y retransmite con `broadcast`, y todos lo ven al instante. Eso hace posible el chat en vivo."

**Si preguntan limitaciones:** sin historial, sin autenticación, sin salas y sin reconexión automática.

---

## Tabla rápida

| Tema | Archivo | Líneas |
|---|---|---|
| Dependencia `ws` | `package.json` | 6-11 |
| `require('ws')` | `server.js` | 4 |
| Montar WebSocket | `server.js` | 21 |
| `broadcast` | `server.js` | 24-29 |
| Conexión / mensaje / cierre | `server.js` | 31-54 |
| Heartbeat | `server.js` | 56-65 |
| Conectar cliente | `index.html` | 134 |
| `onmessage` | `index.html` | 146-154 |
| Enviar | `index.html` | 169-176 |
