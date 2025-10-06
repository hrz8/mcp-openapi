import { z } from 'zod';

const PassengerTypeCode = z.enum(['ADT', 'CHD', 'INF'], {
  description: 'Passenger type: ADT=Adult (12+ years), CHD=Child (2-11 years), INF=Infant (0-23 months)',
});

const FlowCode = z.enum(['Revenue', 'Award', 'Upgrade'], {
  description: 'Booking flow type: Revenue=paid tickets, Award=redemption with points/miles, Upgrade=cabin upgrades. Always use Revenue by default unless specified otherwise by the customer.',
});

const ItinerarySegment = z.object({
  originLocationCode: z.string()
    .length(3)
    .regex(/^[A-Z]{3}$/)
    .describe('IATA airport code for departure city (3 uppercase letters, e.g., KUL for Kuala Lumpur)'),
  destinationLocationCode: z.string()
    .length(3)
    .regex(/^[A-Z]{3}$/)
    .describe('IATA airport code for arrival city (3 uppercase letters, e.g., SIN for Singapore)'),
  departureDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe('Departure date in ISO format YYYY-MM-DD (e.g., 2025-09-30). Must be a future date.'),
  isRequestedBound: z.boolean()
    .describe('Whether this segment is the primary requested journey. Set true for outbound/main flight, false for return flights in round-trip searches.'),
});

const Traveler = z.object({
  passengerTypeCode: PassengerTypeCode
    .describe('Type of passenger for pricing and service determination'),
});

const FlightSearchBodySchema = z
  .object({
    commercialFareFamilies: z.array(z.string())
      .min(1)
      .describe('Array of fare family codes to filter search results. Common codes: CFFECO (Economy), CFFBUS (Business), CFFFIR (First). Use airline-specific codes for targeted searches.'),
    itineraries: z.array(ItinerarySegment)
      .min(1)
      .max(10)
      .describe('Flight segments defining the journey. Single segment = one-way, two segments = round-trip. Each segment represents one flight leg of the complete journey.'),
    selectedBoundId: z.string()
      .optional()
      .describe('Optional identifier for pre-selected outbound flight in round-trip bookings. Used when customer has already chosen their outbound flight and is now selecting return options.'),
    flowCode: FlowCode
      .default('Revenue')
      .describe('Booking flow context that determines available options and pricing logic'),
    travelers: z.array(Traveler)
      .min(1)
      .max(9)
      .describe('List of all passengers for the booking. Each traveler object represents one person. Total count affects pricing and availability. Maximum 9 passengers per booking.'),
  })
  .describe('Flight search request schema for airline booking systems. Supports one-way and round-trip searches with multiple passenger types and fare family filtering.');

export const InitializeBookingSchema = z.object({
  requestBody: FlightSearchBodySchema
    .describe('Initial flight search parameters to validate and establish booking session. This creates the foundation for subsequent flight searches.'),
}).describe('REQUIRED FIRST STEP: Initialize booking session with airline system. Call this endpoint first to receive a session token, then use that token for actual flight searches. The session token will be returned in the response headers and must be captured for the next step.');

export const FlightSearchSchema = z.object({
  'session-token': z.string()
    .min(1)
    .describe('Required authentication token obtained from the initialization step. This token is generated during booking initialization and returned in the response headers (look for "Session-Token" header). The token maintains booking context and enables flight search functionality. WITHOUT this token, flight searches will fail.'),
  requestBody: FlightSearchBodySchema
    .describe('Flight search parameters for finding available flights. Can be identical to initialization parameters or refined based on customer preferences.'),
}).describe('STEP 2: Perform actual flight search using session token from initialization. This endpoint searches for available flights matching the criteria and returns flight options with pricing and schedules.');
