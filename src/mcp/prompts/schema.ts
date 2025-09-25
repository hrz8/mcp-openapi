import { z } from 'zod';

export const GenerateItineraryArgsSchema = z.object({
  destination: z.string().describe('Destination city or airport code'),
  duration: z.number().optional().describe('Trip duration in days'),
  travelStyle: z.enum(['business', 'leisure', 'family', 'adventure']).optional(),
  interests: z.array(z.string()).optional().describe('Traveler interests'),
});

export const UnsupportedRouteArgsSchema = z.object({
  requestedDestination: z.string().describe('The destination that was requested but is not supported'),
  supportedAlternatives: z.array(z.string()).describe('List of supported destinations to offer as alternatives'),
});

export const SupportedRouteConfirmedArgsSchema = z.object({
  origin: z.string()
    .length(3)
    .regex(/^[A-Z]{3}$/)
    .describe('Origin airport code (3 uppercase letters)'),
  destination: z.string()
    .length(3)
    .regex(/^[A-Z]{3}$/)
    .describe('Destination airport code (3 uppercase letters)'),
  destinationName: z.string().describe('Destination city name for user-friendly display'),
});

export const BookingTransitionArgsSchema = z.object({
  userIntent: z.enum(['check_flights', 'book_flights', 'flight_search'])
    .describe('Type of booking intent detected from user message'),
  origin: z.string()
    .length(3)
    .regex(/^[A-Z]{3}$/)
    .optional()
    .describe('Origin airport code if specified by user'),
  destination: z.string()
    .length(3)
    .regex(/^[A-Z]{3}$/)
    .optional()
    .describe('Destination airport code if specified by user'),
  missingInfo: z.array(z.enum(['dates', 'passengers', 'class', 'origin', 'destination']))
    .optional()
    .describe('List of missing information needed to complete booking'),
});
