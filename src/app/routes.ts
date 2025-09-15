import express from 'express';

import type { TransportMap } from '../transports/types.js';

import { handleStatelessRequest, handleStatefulRequest } from './handler.js';
import { RUN_IN_LAMBDA } from '../utils/config.js';

export function clientToServerHandler(transports: TransportMap): express.RequestHandler {
  return async (req, res) => {
    if (RUN_IN_LAMBDA) {
      return handleStatelessRequest(req, res);
    } else {
      return handleStatefulRequest(req, res, transports);
    }
  };
}

export function serverToClientHandler(transports: TransportMap): express.RequestHandler {
  return async (req, res) => {
    if (RUN_IN_LAMBDA) {
      res.status(405).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Method not allowed in Lambda stateless mode.',
        },
        id: null,
      });
      return;
    }

    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    const transport = sessionId ? transports.get(sessionId) : undefined;

    if (!sessionId || !transport) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }

    await transport.handleRequest(req, res);
  };
}
