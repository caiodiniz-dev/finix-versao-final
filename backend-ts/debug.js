// Debug simples para testar o servidor
const http = require('http');

console.log('Iniciando servidor de debug...');

const server = http.createServer((req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    ok: true,
    timestamp: new Date().toISOString(),
    path: req.url,
    method: req.method
  }));
});

server.listen(8000, () => {
  console.log(`✅ Debug server rodando em http://localhost:8000`);
});

server.on('error', (err) => {
  console.error('❌ Erro do servidor:', err);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Erro não capturado:', err);
});
