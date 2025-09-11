import { InitializeBookingSchema, FlightSearchSchema } from './input-schema';
import { McpToolDefinition } from './types';

export const tools: Map<string, McpToolDefinition> = new Map([
  [
    'initialize_booking_session',
    {
      name: 'initialize_booking_session',
      description: 'Initialize a new booking session.',
      inputSchema: InitializeBookingSchema,
      method: 'post',
      pathTemplate: '/initialisation',
      executionParameters: [],
      requestBodyContentType: 'application/json',
      securityRequirements: [
        {
          HeaderApiToken: [],
          HeaderApimSubscriptionKey: [],
          HeaderApiVersion: [],
        },
      ],
    },
  ],
  [
    'search_flights',
    {
      name: 'search_flights',
      description: `Perform a flight search based on search criteria. This operation required 'initialize_booking_session' to be exexcuted first to start the session.`,
      inputSchema: FlightSearchSchema,
      method: 'post',
      pathTemplate: '/flight-search/flights',
      executionParameters: [
        {
          name: 'session-token',
          in: 'header',
        },
      ],
      requestBodyContentType: 'application/json',
      securityRequirements: [
        {
          HeaderApiToken: [],
          HeaderApimSubscriptionKey: [],
          HeaderApiVersion: [],
        },
      ],
    },
  ],
]);
