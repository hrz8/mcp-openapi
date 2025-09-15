import http from 'node:http';

import { MCP_SERVER_VERSION, MCP_SERVER_NAME } from '../utils/config';
import { createExpressApp } from '../app';
import { TransportMap } from './types';

function listener(port: number) {
  return () => {
    console.info(`${MCP_SERVER_NAME} MCP Server (v${MCP_SERVER_VERSION}) running on HTTP port ${port}`);
    console.info(`Health check available at: http://localhost:${port}/health`);
    console.info(`MCP endpoint available at: http://localhost:${port}/mcp`);
  };
}

export async function startHttpServer(port: number, transports: TransportMap) {
  const app = createExpressApp(transports);

  http.createServer(app).listen(port, listener(port));
}
