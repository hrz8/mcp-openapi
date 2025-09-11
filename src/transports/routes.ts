import { randomUUID } from 'node:crypto';

import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import express from 'express';

import { MCP_ALLOWED_HOSTS } from '../utils/config';
import { createServer } from '../utils/server';
import { TransportMap } from './types';

export function clientToServerHandler(transports: TransportMap): express.RequestHandler {
  return async (req, res) => {
    try {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      let transport = sessionId ? transports.get(sessionId) : undefined;
      let isNewTransport = false;

      if (!sessionId && !isInitializeRequest(req.body)) {
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Bad Request: No valid session ID provided',
          },
          id: null,
        });
        return;
      }

      if (!sessionId && isInitializeRequest(req.body)) {
        const newTransport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sessionId) => {
            transports.set(sessionId, newTransport);
          },
          enableDnsRebindingProtection: true,
          allowedHosts: MCP_ALLOWED_HOSTS,
        });
        newTransport.onclose = () => {
          if (newTransport.sessionId) {
            transports.delete(newTransport.sessionId);
          }
        };

        transport = newTransport;
        isNewTransport = true;
      }

      const server = createServer();
      if (isNewTransport) {
        await server.connect(transport!);
      }

      await transport!.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('Error handling MCP request:', error);

      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: null,
        });
      }
    }
  };
}

export function serverToClientHandler(transports: TransportMap): express.RequestHandler {
  return async (req, res) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    const transport = sessionId ? transports.get(sessionId) : undefined;

    if (!sessionId || !transport) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }

    await transport.handleRequest(req, res);
  };
}
