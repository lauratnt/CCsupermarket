// proxyConfig.js
const { createProxyMiddleware } = require('http-proxy-middleware');

const target = 'http://localhost:3000/'; // Sostituisci con l'indirizzo del tuo server di backend

const proxyOptions = {
  target,
  changeOrigin: true, // Abilita il cambio di origine per le richieste cross-origin
};

const proxy = createProxyMiddleware('/api', proxyOptions); // Configura il proxy per le richieste che iniziano con /api

module.exports = function (app) {
  app.use('/api', proxy);
};
