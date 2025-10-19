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
if (!process.env.USE_PROXY) {
  const rateLimit = require('express-rate-limit');
  const limiter = rateLimit({
    windowMs: process.env.RATE_LIMITER_WINDOW_MS,
    max: process.env.RATE_LIMITER_MAX_REQUESTS,
    message: 'To many requests, please try again later.'
  });

  app.use(limiter);
}

app.get('/', (req, res) => {
  res.redirect('https://muckmuck96.github.io/obsidian-file-share/');
});

let users = {};  
const connectionCounts = {};
const requestCounts = {};
const maxConnectionsPerWindow = process.env.RATE_LIMITER_MAX_CONNECTIONS;
const maxRequestsPerWindow = process.env.RATE_LIMITER_MAX_REQUESTS;
const windowMs = process.env.RATE_LIMITER_WINDOW_MS;

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;

  if(!rateLimitCheck(ip, connectionCounts, maxConnectionsPerWindow, 'To many connections')) {
    ws.close(1008, 'To many connections');
    return;
  }

  ws.on('message', (message) => {
    if(!rateLimitCheck(ip, requestCounts, maxRequestsPerWindow, 'To many requests')) {
      return;
    }

    const data = JSON.parse(message);

    switch(data.type) {
      case 'login':
        handleLogin(ws, data);
        break;
      case 'file':
        handleFile(ws, data);
        break;
      case 'fileMetadata':
        handleFileMetadata(ws, data);
        break;
      case 'fileChunk':
        handleFileChunk(ws, data);
        break;
      case 'checkOnline':
        handleCheckOnline(ws, data);
        break;
      case 'request':
        handleRequest(ws, data);
        break;
      case 'response':
        handleResponse(ws, data);
        break;
    }
  });

  ws.on('close', () => {
    handleLogout(ws);
  });
});

function rateLimitCheck(ip, cache, max, message) {
  if (process.env.USE_PROXY) {
    return true;
  }
  if(!cache[ip]) {
    cache[ip] = 1;
  } else {
    cache[ip]++;
  }

  if(cache[ip] > max) {
    console.log(`Rate limit exceeded for ${ip}: ${message}`);
    return false;
  }

  setTimeout(() => {
    cache[ip]--;
    if (cache[ip] === 0) {
      delete cache[ip];
    }
  }, windowMs);
  return true;
}

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
      name: ws.name,
      hash: data.hash,
      sourceFolderPath: data.sourceFolderPath
    }));
  }
}

function handleFileMetadata(ws, data) {
  if (users[data.target]) {
    users[data.target].send(JSON.stringify({
      type: 'fileMetadata',
      payload: data.payload,
      sender: ws.name,
      hash: data.hash,
      sourceFolderPath: data.sourceFolderPath
    }));
  }
}

function handleFileChunk(ws, data) {
  if (users[data.target]) {
    users[data.target].send(JSON.stringify({
      type: 'fileChunk',
      payload: data.payload,
      sender: ws.name,
      hash: data.hash,
      sourceFolderPath: data.sourceFolderPath
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

function handleRequest(ws, data) {
  if (users[data.target]) {
    users[data.target].send(JSON.stringify({
      type: 'request',
      sender: ws.name,
      filename: data.filename,
      id: data.id,
      sourceFolderPath: data.sourceFolderPath
    }));
  }
}

function handleResponse(ws, data) {
  if (users[data.target]) {
    users[data.target].send(JSON.stringify({
      type: 'response',
      from: ws.name,
      accepted: data.accepted,
      filename: data.filename,
      hash: data.hash,
      id: data.id
    }));
  }
}

server.listen(process.env.SOCKET_PORT, () => {
  console.log(`Server is listening on port ${process.env.SOCKET_PORT}`);
});
