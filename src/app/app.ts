import express from 'express';
import cors from 'cors';

import { MCP_SERVER_VERSION, MCP_SERVER_NAME, RUN_IN_LAMBDA } from '../utils/config';
import { clientToServerHandler, serverToClientHandler } from './routes';
import { TransportMap } from '../transports/types';

const MCP_PATH = '/mcp';

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
  app.post(MCP_PATH, clientToServerHandler(transports));

  // Handle GET requests for server-to-client notifications via SSE
  app.get(MCP_PATH, serverToClientHandler(transports));

  // Handle DELETE requests for session termination
  app.delete(MCP_PATH, serverToClientHandler(transports));
}

export function createExpressApp(
  transports: TransportMap,
): express.Express {
  const app = express();

  registerMiddlewares(app);

  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      server: MCP_SERVER_NAME,
      version: MCP_SERVER_VERSION,
      mode: RUN_IN_LAMBDA ? 'stateless-lambda' : 'stateful',
      transport: 'streamable-http',
      sessions: RUN_IN_LAMBDA ? 0 : transports.size,
    });
  });

  registerRoutes(app, transports);

  return app;
}
