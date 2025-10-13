import swaggerJsdoc from 'swagger-jsdoc';
import type { Express } from 'express';
import swaggerUi from 'swagger-ui-express';

/**
 * Swagger/OpenAPI Configuration
 * Automatski generiše API dokumentaciju iz JSDoc komentara
 */

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Servis Todosijević API',
      version: '1.0.0',
      description: `
        Kompletna API dokumentacija za Frigo Sistem Todosijević aplikaciju.
        
        **Funkcionalnosti:**
        - 🔐 Autentikacija (Session + JWT)
        - 👥 Upravljanje korisnicima i klijentima
        - 🔧 Upravljanje servisima i aparatima
        - 📊 Billing i izvještaji
        - 📦 Rezervni dijelovi
        - 📧 Email i SMS notifikacije
        
        **Autentikacija:**
        - Session-based: POST /api/login (cookie)
        - JWT-based: POST /api/jwt-login (Bearer token)
      `,
      contact: {
        name: 'Frigo Sistem Todosijević',
        email: 'gruica@frigosistemtodosijevic.com',
        url: 'https://www.tehnikamne.me'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      },
      {
        url: 'https://www.tehnikamne.me',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        sessionAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'connect.sid',
          description: 'Session-based authentication cookie'
        },
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token authentication (30-day expiration)'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            username: { type: 'string' },
            fullName: { type: 'string' },
            role: { 
              type: 'string',
              enum: ['admin', 'technician', 'customer', 'business_partner']
            },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            isVerified: { type: 'boolean' }
          }
        },
        Client: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            fullName: { type: 'string' },
            phone: { type: 'string' },
            email: { type: 'string', format: 'email' },
            address: { type: 'string' },
            city: { type: 'string' }
          }
        },
        Service: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            clientId: { type: 'integer' },
            applianceId: { type: 'integer' },
            technicianId: { type: 'integer' },
            description: { type: 'string' },
            status: { 
              type: 'string',
              enum: ['pending', 'in_progress', 'completed', 'cancelled']
            },
            warrantyStatus: { 
              type: 'string',
              enum: ['u garanciji', 'van garancije', 'nepoznato']
            },
            cost: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            stack: { type: 'string', description: 'Available in development mode only' }
          }
        }
      },
      responses: {
        Unauthorized: {
          description: 'Unauthorized - Authentication required',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: { type: 'string', example: 'Niste prijavljeni' }
                }
              }
            }
          }
        },
        Forbidden: {
          description: 'Forbidden - Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: { type: 'string', example: 'Nemate dozvolu' }
                }
              }
            }
          }
        },
        ServerError: {
          description: 'Internal Server Error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    },
    tags: [
      { name: 'Authentication', description: 'Login, logout, user verification' },
      { name: 'Users', description: 'User management' },
      { name: 'Clients', description: 'Client management' },
      { name: 'Appliances', description: 'Appliance registry' },
      { name: 'Services', description: 'Service lifecycle management' },
      { name: 'Technicians', description: 'Technician operations' },
      { name: 'Admin', description: 'Administrative operations' },
      { name: 'Billing', description: 'Billing reports and invoicing' },
      { name: 'Spare Parts', description: 'Spare parts management' },
      { name: 'Misc', description: 'Miscellaneous utilities' }
    ]
  },
  // Skenira sve route fajlove za JSDoc komentare
  apis: [
    './server/routes/*.ts',
    './server/routes/*.js'
  ]
};

// Generiši Swagger specification
export const swaggerSpec = swaggerJsdoc(swaggerOptions);

/**
 * Setup Swagger UI middleware
 */
export function setupSwagger(app: Express) {
  // Swagger JSON endpoint
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Servis Todosijević API Docs',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true
    }
  }));

  console.log('📚 [SWAGGER] API Documentation available at /api-docs');
}
