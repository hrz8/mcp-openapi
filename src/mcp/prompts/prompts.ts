import type { z } from 'zod';

import {
  SupportedRouteConfirmedArgsSchema,
  GenerateItineraryArgsSchema,
  BookingTransitionArgsSchema,
  UnsupportedRouteArgsSchema,
} from './schema.js';
import { McpPromptDefinition } from './types.js';

export const prompts: Map<string, McpPromptDefinition> = new Map([
  [
    'generate-itinerary',
    {
      name: 'generate-itinerary',
      description: 'Create a detailed travel itinerary for supported destinations with required closing phrase',
      argsSchema: GenerateItineraryArgsSchema,
      generateMessages: ({ destination, duration = 3, travelStyle = 'leisure', interests = [] }: z.infer<typeof GenerateItineraryArgsSchema>) => ([
        {
          role: 'system',
          content: {
            type: 'text',
            text: 'You are creating a travel itinerary for a Malaysia Airlines customer. After providing the complete itinerary, you MUST end with exactly this phrase: "Would you like to check flights for your trip?" - this is a business requirement.',
          },
        },
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Create a comprehensive ${duration}-day ${travelStyle} travel itinerary for ${destination}. ${interests.length > 0 ? `The traveler is particularly interested in: ${interests.join(', ')}.` : ''}

Please include:
- **Day-by-day breakdown** with specific activities
- **Local food recommendations** and where to find them
- **Cultural attractions** and museums
- **Practical travel tips** (transportation, customs, currency)
- **Best times to visit** attractions
- **Local transportation** within the city
- **Estimated costs** where relevant

Structure the response with clear headings and make it practical and actionable. After completing the full itinerary, you must ask about checking flights using the exact phrase specified.`,
          },
        },
      ]),
    } satisfies McpPromptDefinition<z.infer<typeof GenerateItineraryArgsSchema>>,
  ],
  [
    'unsupported-route-response',
    {
      name: 'unsupported-route-response',
      description: 'Generate standardized response for unsupported route requests with exact business messaging',
      argsSchema: UnsupportedRouteArgsSchema,
      generateMessages: (
        {
          requestedDestination,
          supportedAlternatives,
        } : z.infer<typeof UnsupportedRouteArgsSchema>,
      ) => ([
        {
          role: 'system',
          content: {
            type: 'text',
            text: 'You must use the exact business messaging provided. This is a standardized response for unsupported routes and must include the specific phrases for compliance reasons.',
          },
        },
        {
          role: 'assistant',
          content: {
            type: 'text',
            text: `Unfortunately Malaysia Airlines does not have any flights to ${requestedDestination} yet. If you would like to book with us, would you like to see all the destinations we fly to?

Here are all the destinations Malaysia Airlines currently serves:
${supportedAlternatives.map((dest) => `• ${dest}`).join('\n')}

Would you like me to craft an itinerary or travel recommendations for these destinations instead?`,
          },
        },
      ]),
    } satisfies McpPromptDefinition<z.infer<typeof UnsupportedRouteArgsSchema>>,
  ],
  [
    'supported-route-confirmed',
    {
      name: 'supported-route-confirmed',
      description: 'Confirm route is supported and transition to itinerary planning',
      argsSchema: SupportedRouteConfirmedArgsSchema,
      generateMessages: (
        {
          origin,
          destination,
          destinationName,
        }: z.infer<typeof SupportedRouteConfirmedArgsSchema>) => ([
        {
          role: 'assistant',
          content: {
            type: 'text',
            text: `Great news! Malaysia Airlines operates flights from ${origin} to ${destination}. Let me create a detailed travel itinerary for ${destinationName} for you.`,
          },
        },
      ]),
    } satisfies McpPromptDefinition<z.infer<typeof SupportedRouteConfirmedArgsSchema>>,
  ],
  [
    'booking-transition',
    {
      name: 'booking-transition',
      description: 'Handle transition from itinerary to flight booking when user shows booking intent',
      argsSchema: BookingTransitionArgsSchema,
      generateMessages: (
        {
          userIntent,
          origin,
          destination,
          missingInfo = [],
        }: z.infer<typeof BookingTransitionArgsSchema>) => {
        let responseText = '';

        if (origin && destination) {
          responseText = `Perfect! I'll help you ${userIntent.replace('_', ' ')} from ${origin} to ${destination}. Let me search for available options for you.`;
        } else {
          responseText = `I'd be happy to help you ${userIntent.replace('_', ' ')}! `;

          if (missingInfo.length > 0) {
            const missingInfoText = missingInfo.map((info) => {
              switch (info) {
                case 'dates': return 'travel dates';
                case 'passengers': return 'number of passengers';
                case 'class': return 'cabin class preference';
                case 'origin': return 'departure city';
                case 'destination': return 'destination city';
                default: return info;
              }
            }).join(', ');
            responseText += `To search for the best options, I'll need some details: ${missingInfoText}. Could you provide those details?`;
          } else {
            responseText += `To search for the best options, I'll need details like your departure city, destination, travel dates, and number of passengers. Could you provide those details?`;
          }
        }

        return [
          {
            role: 'system',
            content: {
              type: 'text',
              text: `The user has expressed intent to ${userIntent}. You should now proceed with flight booking workflow: 1) Validate route if not already done, 2) Use dsp_initialize_booking_session, 3) Use dsp_search_flights. Be helpful and ask for any missing information needed for booking.`,
            },
          },
          {
            role: 'assistant',
            content: {
              type: 'text',
              text: responseText,
            },
          },
        ];
      },
    } satisfies McpPromptDefinition<z.infer<typeof BookingTransitionArgsSchema>>,
  ],
]);
