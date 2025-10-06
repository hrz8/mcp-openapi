import { AxiosResponse } from 'axios';

import type { FlightSearchResponse, McpToolDefinition, ErrorDetail, Warning } from './types.js';

import { InitializeBookingSchema, FlightSearchSchema, CreateCartSchema } from './input-schema.js';
import { formatDuration, formatPrice, formatDate, formatTime } from '../../helpers/formatter.js';

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
      serializer: (response: AxiosResponse): string => {
        const sessionToken = response.headers['session-token'];

        let output = 'BOOKING SESSION INITIALIZED\n';
        output += '='.repeat(80) + '\n\n';

        if (sessionToken) {
          output += `Session Token: ${sessionToken}\n`;
          output += '(Token has been captured and will be used automatically for subsequent requests)\n\n';
        }

        output += 'Status: Ready\n';
        output += 'Next step: Use search_flights tool to find available flights\n';

        return output;
      },
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
      serializer: (response: AxiosResponse<FlightSearchResponse>): string => {
        const { data: responseData } = response;
        const { data, dictionaries } = responseData;
        const { airBoundGroups } = data;

        let output = 'FLIGHT SEARCH RESULTS\n';
        output += '='.repeat(80) + '\n\n';

        if (!airBoundGroups || airBoundGroups.length === 0) {
          return output + 'No flights found matching your criteria.\n';
        }

        airBoundGroups.forEach((group, groupIdx) => {
          const { boundDetails, airBounds } = group;
          const { origin, destination, duration, segments, isFastestBound } = boundDetails;

          const originLoc = dictionaries.location[origin.airportCode];
          const destLoc = dictionaries.location[destination.airportCode];

          if (!originLoc || !destLoc) {
            output += `Warning: Location information not available for group ${groupIdx + 1}\n\n`;
            return;
          }

          if (!segments || segments.length === 0) {
            output += `Warning: No segment information for group ${groupIdx + 1}\n\n`;
            return;
          }

          const firstSegment = segments[0]!;
          const flightDetails = dictionaries.flight[firstSegment.flightId];

          if (!flightDetails) {
            output += `Warning: Flight details not available for group ${groupIdx + 1}\n\n`;
            return;
          }

          const allPrices = airBounds.map((ab) => ab.prices.totalPrice.total);
          const minPrice = Math.min(...allPrices);
          const maxPrice = Math.max(...allPrices);
          const currency = airBounds[0]?.prices.totalPrice.original.currencyCode || 'MYR';

          // Extract flight number for the header
          const mainFlightNumber = flightDetails.flightDesignator.marketing.flightNumber;
          const mainAirlineCode = flightDetails.flightDesignator.marketing.airlineCode;

          output += `OPTION ${groupIdx + 1}${isFastestBound ? ' (FASTEST)' : ''}\n`;
          output += `Flight: ${mainAirlineCode}${mainFlightNumber}\n`;
          output += `Route: ${originLoc.cityName} (${origin.airportCode}) -> ${destLoc.cityName} (${destination.airportCode})\n`;
          output += `Departure: ${formatDate(flightDetails.departure.dateTime)} at ${formatTime(
            flightDetails.departure.dateTime,
          )}\n`;
          output += `Duration: ${formatDuration(duration)}\n`;
          output += `Price Range: ${formatPrice(minPrice, currency)} - ${formatPrice(maxPrice, currency)}\n`;

          output += '\nFlight Details:\n';
          segments.forEach((seg, segIdx) => {
            const flight = dictionaries.flight[seg.flightId];
            if (flight) {
              const airline = dictionaries.airline[flight.flightDesignator.marketing.airlineCode];
              const flightNum = flight.flightDesignator.marketing.flightNumber;
              const operatingAirline =
                dictionaries.airline[flight.flightDesignator.operating.airlineCode];

              output += `  ${segIdx + 1}. ${airline} ${flightNum}`;

              // Show if operated by different airline (code share)
              if (
                flight.flightDesignator.marketing.airlineCode
                !== flight.flightDesignator.operating.airlineCode
              ) {
                output += ` (operated by ${operatingAirline})`;
              }

              output += `\n     Aircraft: ${flight.aircraftName}\n`;
              output += `     ${flight.departure.locationCode}`;
              if (flight.departure.terminal) {
                output += ` T${flight.departure.terminal}`;
              }
              output += ` ${formatTime(flight.departure.dateTime)}`;
              output += ` -> ${flight.arrival.locationCode}`;
              if (flight.arrival.terminal) {
                output += ` T${flight.arrival.terminal}`;
              }
              output += ` ${formatTime(flight.arrival.dateTime)}`;
              if (seg.arrivalDaysDifference) {
                output += ` +${seg.arrivalDaysDifference}d`;
              }
              output += `\n`;
            }
          });

          const econFares = airBounds.filter((ab) => {
            const ff = dictionaries.fareFamilyWithServices[ab.fareFamilyCode];
            return ff?.cabin === 'eco';
          });
          const busFares = airBounds.filter((ab) => {
            const ff = dictionaries.fareFamilyWithServices[ab.fareFamilyCode];
            return ff?.cabin === 'business';
          });

          if (econFares.length > 0) {
            output += '\nEconomy Class Options:\n';
            econFares.forEach((fare) => {
              const isRecommended = fare.extraProperties?.isRecommended;
              const isCheapest = fare.isCheapestOffer;
              const price = formatPrice(fare.prices.totalPrice.total, currency);
              const fareFamily = fare.fareFamilyCode;
              const availability = fare.availabilityDetails?.[0];

              if (!availability) {
                return;
              }

              output += `  ${isRecommended ? '[RECOMMENDED] ' : isCheapest ? '[CHEAPEST] ' : ''}${fareFamily}: ${price}`;
              output += ` | Class: ${availability.bookingClass}`;
              if (availability.seatLeft) {
                output += ` | ${availability.seatLeft} seats left`;
              }
              output += `\n     AirBoundID: ${fare.airBoundId}\n`;
            });
          }

          if (busFares.length > 0) {
            output += '\nBusiness Class Options:\n';
            busFares.forEach((fare) => {
              const isRecommended = fare.extraProperties?.isRecommended;
              const price = formatPrice(fare.prices.totalPrice.total, currency);
              const fareFamily = fare.fareFamilyCode;
              const availability = fare.availabilityDetails?.[0];

              if (!availability) {
                return;
              }

              output += `  ${isRecommended ? '[RECOMMENDED] ' : ''}${fareFamily}: ${price}`;
              output += ` | Class: ${availability.bookingClass}`;
              if (availability.seatLeft) {
                output += ` | ${availability.seatLeft} seats left`;
              }
              output += `\n     AirBoundID: ${fare.airBoundId}\n`;
            });
          }

          output += '\n' + '-'.repeat(80) + '\n\n';
        });

        output += 'To select a flight, use the create_cart tool with the desired AirBoundID(s)\n';

        return output;
      },
    },
  ],
  [
    'create_cart',
    {
      name: 'create_cart',
      description: `Create a shopping cart with selected flight options. PREREQUISITES: Must call 'initialize_booking_session' first, then 'search_flights' to get available flight options. This endpoint adds the customer's selected flights (identified by airBoundIds from search results) to a cart for booking. The cart validates selections, checks availability, and calculates final pricing. WORKFLOW POSITION: Step 3 of the booking flow (after initialization and search, before passenger details and payment). RESPONSE: Returns a cartId which is required for subsequent booking operations. IMPORTANT: All airBoundIds must come from the most recent search_flights response within the same session.`,
      inputSchema: CreateCartSchema,
      method: 'post',
      pathTemplate: '/carts',
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
      serializer: (response: AxiosResponse<{
        data: {
          cartId: string;
        };
        warnings?: Warning[];
        errors?: ErrorDetail[];
      }>): string => {
        const { data } = response;

        let output = 'CART CREATION RESULT\n';
        output += '='.repeat(80) + '\n\n';

        if (data.errors && data.errors.length > 0) {
          output += 'ERRORS:\n';
          data.errors.forEach((error) => {
            output += `  - [${error.code}] ${error.message}\n`;
            if (error.details) {
              output += `    Details: ${JSON.stringify(error.details)}\n`;
            }
          });
          return output;
        }

        output += `Cart created successfully!\n\n`;
        output += `Cart ID: ${data.data.cartId}\n\n`;

        if (data.warnings && data.warnings.length > 0) {
          output += 'WARNINGS:\n';
          data.warnings.forEach((warning) => {
            output += `  - [${warning.code}] ${warning.message}\n`;
          });
          output += '\n';
        }

        output += 'Next steps:\n';
        output += '  1. Add passenger details\n';
        output += '  2. Select ancillary services (baggage, meals, etc.)\n';
        output += '  3. Proceed to payment\n';

        return output;
      },
    },
  ],
]);
