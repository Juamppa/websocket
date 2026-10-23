# Guion de exposición: Chat con WebSocket

## 1. Qué es WebSocket

Es un protocolo de comunicación **bidireccional** entre cliente y servidor.
A diferencia de HTTP, la conexión queda **abierta**, así que el servidor puede enviar datos sin que el cliente los pida.

> "HTTP es como mandar una carta; WebSocket es como una llamada telefónica."

Eso es lo que necesita un chat: avisar al instante cuando alguien escribe.

---

## 2. Handshake

WebSocket empieza como una petición HTTP y luego se actualiza al protocolo WebSocket.

```js
// server.js:21
const wss = new WebSocketServer({ server });
```

El servidor HTTP y el WebSocket comparten el mismo puerto: la página se sirve por HTTP y el chat usa WebSocket sobre ese mismo servidor.

---

## 3. Servidor (`server.js`)

**Crear el servidor:** `new WebSocketServer({ server })` crea el servidor WebSocket (`wss`).

**`connection`:** se dispara cuando entra un cliente. Ahí se avisa cuántos hay:

```js
broadcast({ type: 'usuarios', total: wss.clients.size });
```

**`message`:** se dispara cuando un cliente envía algo. El mensaje llega como texto, por eso:

```js
const msg = JSON.parse(raw);
```

Luego se validan los datos (nombre máximo 20 caracteres, texto máximo 500, se ignora si está vacío) y un `try/catch` evita que un JSON inválido rompa el servidor.

**`broadcast`:** es el corazón del chat. Convierte el objeto a JSON y lo manda a todos los clientes conectados:

```js
function broadcast(obj) {
  const data = JSON.stringify(obj);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) client.send(data);
  });
}
```

- `wss.clients`: todos los conectados.
- `readyState === WebSocket.OPEN`: solo envía si la conexión está abierta.
- `client.send(data)`: envía el mensaje.

**`close`:** se dispara cuando alguien se desconecta y se vuelve a difundir el total de usuarios.

> "El servidor recibe, valida y retransmite a todos. Es el intermediario del chat."

---

## 4. Cliente (`index.html`)

**Conectar:**

```js
const ws = new WebSocket('ws://' + location.host);
```

`ws://` es sin cifrar; en producción sería `wss://`. `location.host` usa el mismo servidor de la página.

**Eventos:**

- `onopen`: conexión lista, se habilita el botón.
- `onclose`: conexión cerrada, se deshabilita el botón.
- `onerror`: error de conexión.
- `onmessage`: recibe los datos del servidor.

```js
ws.onmessage = (evento) => {
  const msg = JSON.parse(evento.data);
  if (msg.type === 'usuarios') { /* actualiza el contador */ }
  else if (msg.type === 'mensaje') { /* agrega el mensaje */ }
};
```

El campo `type` indica qué tipo de mensaje llegó.

**Enviar:**

```js
if (!texto || ws.readyState !== WebSocket.OPEN) return;
ws.send(JSON.stringify({ nombre, texto }));
```

Solo se envía si hay texto y la conexión está abierta.

---

## 5. Formato de los mensajes

WebSocket no envía objetos, envía texto. Por eso se usa JSON.

Cliente → servidor:

```json
{ "nombre": "Usuario123", "texto": "Hola a todos" }
```

Servidor → todos:

```json
{ "type": "mensaje", "nombre": "Usuario123", "texto": "Hola a todos", "hora": "..." }
```

> "Definimos un protocolo simple: todo va en JSON y los mensajes del servidor llevan un `type`."

---

## 6. Flujo de un mensaje

1. El cliente escribe y hace `ws.send(...)`.
2. El servidor recibe el evento `message` y valida.
3. El servidor llama a `broadcast`.
4. Se envía a todos los clientes conectados.
5. Cada cliente recibe en `onmessage` y dibuja el mensaje.

El emisor también recibe su propio mensaje: no se dibuja localmente, lo devuelve el servidor a todos.

---

## 7. Puntos para remarcar

- **Tiempo real:** no hay que preguntar cada segundo si hay mensajes nuevos.
- **El servidor centraliza:** los clientes no se conectan entre sí.
- **`readyState`:** siempre verificar antes de enviar.
- **JSON:** serializar con `JSON.stringify` y leer con `JSON.parse`.
- **Seguridad básica:** límites de largo, texto vacío ignorado y `textContent` para evitar inyección de HTML.
- **Limitaciones:** sin historial, sin autenticación, sin salas y sin reconexión automática.

---

## 8. Demo en vivo

1. Ejecutar `npm start`.
2. Abrir `http://localhost:3000` en dos ventanas.
3. Mostrar el contador en "2 personas conectadas".
4. Enviar un mensaje y verlo aparecer en la otra ventana al instante.
5. Cerrar una ventana y ver el contador bajar.
6. Mostrar en la consola las conexiones y desconexiones.

**Cierre:**
> "WebSocket mantiene una conexión abierta y bidireccional. El cliente envía JSON, el servidor valida y retransmite con `broadcast`, y todos reciben el mensaje al instante. Eso hace posible un chat en vivo."
