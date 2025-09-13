import http from 'node:http';

import express from 'express';
import cors from 'cors';

import { clientToServerHandler, serverToClientHandler } from './routes';
import { MCP_SERVER_VERSION, MCP_SERVER_NAME } from '../utils/config';
import { TransportMap } from './types';


function registerMiddlewares(app: express.Express) {
  app.use(cors({
    origin: '*',
    exposedHeaders: ['Mcp-Session-Id'],
    allowedHeaders: ['Content-Type', 'mcp-session-id'],
  }));

  app.use(express.json());
}

function registerRoutes(app: express.Express, transports: TransportMap) {
  // Handle POST requests for client-to-server communication
  app.post('/mcp', clientToServerHandler(transports));

  // Handle GET requests for server-to-client notifications via SSE
  app.get('/mcp', serverToClientHandler(transports));

  // Handle DELETE requests for session termination
  app.delete('/mcp', serverToClientHandler(transports));
}

function listener(port: number) {
  return () => {
    console.info(`${MCP_SERVER_NAME} MCP Server (v${MCP_SERVER_VERSION}) running on HTTP port ${port}`);
    console.info(`Health check available at: http://localhost:${port}/health`);
    console.info(`MCP endpoint available at: http://localhost:${port}/mcp`);
  };
}

export async function startHttpServer(port: number) {
  const app = express();

  registerMiddlewares(app);


  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      server: MCP_SERVER_NAME,
      version: MCP_SERVER_VERSION,
      transport: 'streamable-http',
    });
  });

  const transports: TransportMap = new Map();
  registerRoutes(app, transports);

  http.createServer(app).listen(port, listener(port));
}
