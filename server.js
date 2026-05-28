// ============================================================
//  Snake Arena — Serveur WebSocket
//  node server.js
// ============================================================
const http = require('http');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 8080;

// localhost.run nécessite un serveur HTTP en dessous du WS
const server = http.createServer((req, res) => {
  res.writeHead(200); res.end('Snake Arena OK');
});
const wss = new WebSocketServer({ server });

const clients = new Map();
let nextId = 1;

function broadcast(data, exceptId = null) {
  const msg = JSON.stringify(data);
  for (const [id, c] of clients) {
    if (id !== exceptId && c.ws.readyState === 1) c.ws.send(msg);
  }
}

wss.on('connection', ws => {
  const id = nextId++;
  const client = {
    ws, id, name: 'Joueur', color: '#66e6ff', country: '',
    x: 0, z: 0, dirX: 1, dirZ: 0, length: 8, alive: true,
  };
  clients.set(id, client);

  ws.send(JSON.stringify({ type: 'welcome', id, players: [...clients.values()]
    .filter(c => c.id !== id)
    .map(c => ({ id:c.id, name:c.name, color:c.color, country:c.country,
      x:c.x, z:c.z, dirX:c.dirX, dirZ:c.dirZ, length:c.length, alive:c.alive }))
  }));

  ws.on('message', raw => {
    let msg; try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'join') {
      client.name    = (msg.name    || 'Joueur').slice(0, 16);
      client.color   = msg.color   || '#66e6ff';
      client.country = msg.country || '';
      client.x = msg.x||0; client.z = msg.z||0; client.length = 8; client.alive = true;
      broadcast({ type:'join', id, name:client.name, color:client.color,
        country:client.country, x:client.x, z:client.z,
        dirX:client.dirX, dirZ:client.dirZ, length:client.length }, id);
    }
    else if (msg.type === 'move') {
      client.x=msg.x; client.z=msg.z; client.dirX=msg.dirX; client.dirZ=msg.dirZ; client.length=msg.length;
      broadcast({ type:'move', id, x:msg.x, z:msg.z, dirX:msg.dirX, dirZ:msg.dirZ, length:msg.length }, id);
    }
    else if (msg.type === 'die') {
      client.alive = false;
      broadcast({ type:'die', id, killerName:msg.killerName||'' }, id);
    }
    else if (msg.type === 'respawn') {
      client.alive=true; client.length=8; client.x=msg.x||0; client.z=msg.z||0;
      broadcast({ type:'respawn', id, x:client.x, z:client.z }, id);
    }
  });

  ws.on('close', () => {
    clients.delete(id);
    broadcast({ type:'leave', id });
    console.log(`[-] ${client.name} déconnecté — ${clients.size} en ligne`);
  });

  console.log(`[+] Joueur ${id} connecté — ${clients.size} en ligne`);
});

server.listen(PORT, () => console.log(`Snake Arena serveur démarré sur le port ${PORT}`));
