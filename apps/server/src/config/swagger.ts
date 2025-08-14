import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { config } from './environment';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Campaign Manager API',
      version: '1.0.0',
      description: 'A comprehensive music promotion campaign management platform API',
      contact: {
        name: 'Campaign Manager Support',
        email: 'support@campaignmanager.com',
      },
    },
    servers: [
      {
        url: config.nodeEnv === 'production' 
          ? 'https://api.campaignmanager.com' // Update with your production URL
          : `http://localhost:${config.port}`,
        description: config.nodeEnv === 'production' ? 'Production server' : 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique user identifier',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
            },
            firstName: {
              type: 'string',
              description: 'User first name',
            },
            lastName: {
              type: 'string',
              description: 'User last name',
            },
            role: {
              type: 'string',
              enum: ['USER', 'ADMIN'],
              description: 'User role',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp',
            },
          },
        },
        Artist: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique artist identifier',
            },
            name: {
              type: 'string',
              description: 'Artist name',
            },
            displayName: {
              type: 'string',
              description: 'Artist display name',
            },
            genres: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Artist genres',
            },
            contactInfo: {
              type: 'object',
              description: 'Artist contact information',
            },
            socialProfiles: {
              type: 'array',
              items: {
                type: 'object',
              },
              description: 'Social media profiles',
            },
          },
        },
        Campaign: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique campaign identifier',
            },
            name: {
              type: 'string',
              description: 'Campaign name',
            },
            description: {
              type: 'string',
              description: 'Campaign description',
            },
            status: {
              type: 'string',
              enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'],
              description: 'Campaign status',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Campaign creation timestamp',
            },
          },
        },
        EmailTemplate: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique template identifier',
            },
            name: {
              type: 'string',
              description: 'Template name',
            },
            subject: {
              type: 'string',
              description: 'Email subject line',
            },
            body: {
              type: 'string',
              description: 'Email body content',
            },
            type: {
              type: 'string',
              enum: ['INITIAL_OUTREACH', 'FOLLOW_UP', 'COLLABORATION_PROPOSAL', 'THANK_YOU', 'REJECTION_RESPONSE'],
              description: 'Template type',
            },
            variables: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Template variables',
            },
          },
        },
        OutreachCampaign: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique outreach campaign identifier',
            },
            name: {
              type: 'string',
              description: 'Outreach campaign name',
            },
            description: {
              type: 'string',
              description: 'Outreach campaign description',
            },
            status: {
              type: 'string',
              enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'],
              description: 'Campaign status',
            },
            templateId: {
              type: 'string',
              description: 'Associated email template ID',
            },
            targetArtistIds: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Target artist IDs',
            },
            scheduledStartDate: {
              type: 'string',
              format: 'date-time',
              description: 'Scheduled start date',
            },
            sendingSchedule: {
              type: 'object',
              description: 'Email sending schedule configuration',
            },
            tags: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Campaign tags',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Error message',
            },
            code: {
              type: 'string',
              description: 'Error code',
            },
            details: {
              type: 'object',
              description: 'Additional error details',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
  ],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

export { swaggerSpec, swaggerUi };