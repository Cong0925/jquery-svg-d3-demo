const http = require('http');
const fs = require('fs');
const cors = require('cors');

const server = http.createServer((req, res) => {
    // 启用CORS，允许所有来源访问
    cors()(req, res, () => {
        if (req.url === '/api/getModelById') {
            fs.readFile('../data.json', 'utf8', (err, data) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Internal Server Error' }));
                } else {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(data);
                }
            });
        } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
        }
    });
});

server.on('error', (err) => {
    console.log('Server error:', err.message);
});

server.on('listening', () => {
    const address = server.address();
    const bind = typeof address === 'string'? `pipe ${address}` : `port ${address.port}`;
    console.log(`Server running at ${bind}`);
});

server.listen(3000);