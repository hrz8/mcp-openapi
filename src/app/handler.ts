import { randomUUID } from 'node:crypto';

import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import express from 'express';

import { createMcpServer } from '../utils/mcp-server';
import { MCP_ALLOWED_HOSTS } from '../utils/config';
import { TransportMap } from '../transports/types';

export async function handleStatelessRequest(
  req: express.Request,
  res: express.Response,
) {
  try {
    console.info('Processing stateless request in Lambda mode');

    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
      enableDnsRebindingProtection: true,
      allowedHosts: MCP_ALLOWED_HOSTS,
    });

    res.on('close', () => {
      console.info('Request closed, cleaning up stateless resources');
      transport.close();
      server.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling MCP request in stateless mode:', error);

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
}

export async function handleStatefulRequest(
  req: express.Request,
  res: express.Response,
  transports: TransportMap,
) {
  try {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports.get(sessionId)) {
      console.info(`Use existing session: ${sessionId}`);
      transport = transports.get(sessionId)!;
    } else if (sessionId && !transports.get(sessionId)) {
      console.info(`Session not found: ${sessionId}`);
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Session not found. Please reinitialize.',
        },
        id: null,
      });
      return;
    } else if (!sessionId && isInitializeRequest(req.body)) {
      const newSessionId = randomUUID();
      console.info(`New session initiated: ${newSessionId}`);

      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => newSessionId,
        onsessioninitialized: (sessionId) => {
          transports.set(sessionId, transport);
        },
        enableDnsRebindingProtection: true,
        allowedHosts: MCP_ALLOWED_HOSTS,
      });

      transport.onclose = () => {
        if (transport.sessionId) {
          console.info(`Session closed: ${transport.sessionId}`);
          transports.delete(transport.sessionId);
        }
      };

      const mcpServer = createMcpServer();
      await mcpServer.connect(transport);
    } else {
      console.info(`Invalid session provided: ${sessionId}`);
      if (sessionId) {
        console.info('Reason: transport availability:', transports.has(sessionId));
      }

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

    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Error handling MCP request in stateful mode:', error);
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
}
