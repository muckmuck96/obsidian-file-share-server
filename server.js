const http = require('http');
const https = require('https');
const fs = require('fs');
const WebSocket = require('ws');
const express = require('express');
const app = express();

require("dotenv").config();


let server = http.createServer(app);
if (process.env.CERT_PEM_PATH && process.env.KEY_PEM_PATH) {
  server = https.createServer({
    key: fs.readFileSync(`${process.env.KEY_PEM_PATH}`, 'utf8'),
    cert: fs.readFileSync(`${process.env.CERT_PEM_PATH}`, 'utf8')
  }, app);
}

const wss = new WebSocket.Server({ server });

let users = {};  

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    switch(data.type) {
      case 'login':
        handleLogin(ws, data);
        break;
      case 'file':
        handleFile(ws, data);
        break;
      case 'checkOnline':
        handleCheckOnline(ws, data);
        break;
    }
  });

  ws.on('close', () => {
    handleLogout(ws);
  });
});

function handleLogin(ws, data) {
  users[data.name] = ws;
  ws.name = data.name;
}

function handleLogout(ws) {
  if (ws.name) {
    delete users[ws.name];
  }
}

function handleFile(ws, data) {
  if (users[data.target]) {
    users[data.target].send(JSON.stringify({
      type: 'file',
      filename: data.payload.filename,
      file: data.payload.file,
      aesKey: data.payload.aesKey,
      iv: data.payload.iv,
      sender: data.payload.sender,
      signature: data.payload.signature,
      name: ws.name
    }));
  }
}

function handleCheckOnline(ws, data) {
  ws.send(JSON.stringify({
    type: 'checkOnline',
    target: data.target,
    online: !!users[data.target]
  }));
}

server.listen(process.env.SOCKET_PORT, () => {
  console.log(`Server is listening on port ${process.env.SOCKET_PORT}`);
});
