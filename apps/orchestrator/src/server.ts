/**
 * HTTP and WebSocket server
 */

import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { config } from './config.js';
import type { WebSocketMessage } from './shared/types.js';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

export class Server {
  private httpServer: ReturnType<typeof createServer>;
  public wsServer: WebSocketServer;
  private clients: Set<WebSocket> = new Set();

  constructor() {
    this.httpServer = createServer((req, res) => this.handleHttpRequest(req, res));
    this.wsServer = new WebSocketServer({ server: this.httpServer, path: '/ws' });
    this.setupWebSocket();
  }

  private handleHttpRequest(req: { url?: string }, res: { writeHead: (code: number, headers: Record<string, string>) => void; end: (data?: string) => void }): void {
    let path = req.url || '/';
    
    // Remove query string
    path = path.split('?')[0];
    
    // Serve artifacts (screenshots)
    if (path.startsWith('/artifacts/')) {
      const filePath = join(process.cwd(), path);
      if (existsSync(filePath)) {
        const ext = extname(filePath);
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        const content = readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
        return;
      }
    }
    
    // Serve UI static files (in dev, Vite handles this; in prod, serve from dist)
    if (path === '/' || path === '/index.html') {
      const uiPath = join(process.cwd(), 'apps/ui/index.html');
      if (existsSync(uiPath)) {
        const content = readFileSync(uiPath, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(content);
        return;
      }
    }
    
    if (path === '/styles.css') {
      const cssPath = join(process.cwd(), 'apps/ui/styles.css');
      if (existsSync(cssPath)) {
        const content = readFileSync(cssPath, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'text/css' });
        res.end(content);
        return;
      }
    }
    
    // 404
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  }

  private setupWebSocket(): void {
    this.wsServer.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);
      console.log(`WebSocket client connected. Total clients: ${this.clients.size}`);

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log(`WebSocket client disconnected. Total clients: ${this.clients.size}`);
      });

      ws.on('error', (error: Error) => {
        console.error('WebSocket error:', error);
      });
    });
  }

  broadcast(message: WebSocketMessage): void {
    const data = JSON.stringify(message);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  sendToClient(client: WebSocket, message: WebSocketMessage): void {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  start(): void {
    this.httpServer.listen(config.port, () => {
      console.log(`HTTP server listening on http://localhost:${config.port}`);
      console.log(`WebSocket server available at ws://localhost:${config.port}/ws`);
    });
  }

  stop(): void {
    this.httpServer.close();
    this.wsServer.close();
  }
}

