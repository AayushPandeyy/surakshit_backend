const productionServerUrl = "https://surakshit-backend-nj42.onrender.com";
const localServerUrl = `http://localhost:${process.env.PORT || 3000}`;

const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Surakshit Backend API",
    version: "1.0.0",
    description: "Secure authentication and health APIs for Surakshit backend.",
  },
  servers: [
    {
      url: productionServerUrl,
      description: "Production (Render)",
    },
    {
      url: localServerUrl,
      description: "Local development",
    },
  ],
  tags: [
    { name: "System", description: "System health and diagnostics" },
    { name: "Auth", description: "Authentication endpoints" },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["System"],
        summary: "Health check",
        responses: {
          200: {
            description: "Service health status",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "ok" },
                    service: { type: "string", example: "surakshit_backend" },
                  },
                  required: ["status", "service"],
                },
              },
            },
          },
        },
      },
    },
    "/db/now": {
      get: {
        tags: ["System"],
        summary: "Database connectivity check",
        responses: {
          200: {
            description: "Database responds with current timestamp",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    connected: { type: "boolean", example: true },
                    time: {
                      type: "string",
                      format: "date-time",
                      example: "2026-04-21T16:10:16.540Z",
                    },
                  },
                  required: ["connected", "time"],
                },
              },
            },
          },
          500: {
            $ref: "#/components/responses/InternalServerError",
          },
        },
      },
    },
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user",
        description:
          "Creates a user account and returns an access token. Password must be 12-128 chars and include upper, lower, number, special character, and no spaces.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/RegisterRequest",
              },
              example: {
                fullname: "Test User",
                email: "test.user@example.com",
                phonenumber: "+919876543210",
                dateofbirth: "1998-05-15",
                plan: "FREE",
                password: "StrongPass!234",
              },
            },
          },
        },
        responses: {
          201: {
            description: "Registration successful",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AuthSuccessResponse",
                },
              },
            },
          },
          400: {
            description: "Validation failed",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ValidationErrorResponse",
                },
              },
            },
          },
          409: {
            description: "Duplicate email or phone number",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: {
                      type: "string",
                      example:
                        "An account with this email or phone number already exists",
                    },
                  },
                  required: ["message"],
                },
              },
            },
          },
          429: {
            $ref: "#/components/responses/TooManyRequests",
          },
          500: {
            $ref: "#/components/responses/InternalServerError",
          },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login using email and password",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/LoginRequest",
              },
              example: {
                email: "test.user@example.com",
                password: "StrongPass!234",
              },
            },
          },
        },
        responses: {
          200: {
            description: "Login successful",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AuthSuccessResponse",
                },
              },
            },
          },
          400: {
            description: "Validation failed",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ValidationErrorResponse",
                },
              },
            },
          },
          401: {
            description: "Invalid credentials",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: {
                      type: "string",
                      example: "Invalid email or password",
                    },
                  },
                  required: ["message"],
                },
              },
            },
          },
          429: {
            $ref: "#/components/responses/TooManyRequests",
          },
          500: {
            $ref: "#/components/responses/InternalServerError",
          },
        },
      },
    },
  },
  components: {
    schemas: {
      RegisterRequest: {
        type: "object",
        required: [
          "fullname",
          "email",
          "phonenumber",
          "dateofbirth",
          "password",
        ],
        properties: {
          fullname: {
            type: "string",
            minLength: 2,
            maxLength: 120,
            example: "Test User",
          },
          email: {
            type: "string",
            format: "email",
            example: "test.user@example.com",
          },
          phonenumber: {
            type: "string",
            description: "Phone in E.164 style",
            pattern: "^\\+?[1-9]\\d{7,14}$",
            example: "+919876543210",
          },
          dateofbirth: {
            type: "string",
            format: "date",
            example: "1998-05-15",
          },
          password: {
            type: "string",
            minLength: 12,
            maxLength: 128,
            example: "StrongPass!234",
          },
          plan: {
            type: "string",
            enum: ["FREE", "PREMIUM"],
            default: "FREE",
            example: "FREE",
          },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: {
            type: "string",
            format: "email",
            example: "test.user@example.com",
          },
          password: {
            type: "string",
            minLength: 1,
            maxLength: 128,
            example: "StrongPass!234",
          },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string", example: "1" },
          fullname: { type: "string", example: "Test User" },
          email: {
            type: "string",
            format: "email",
            example: "test.user@example.com",
          },
          phonenumber: { type: "string", example: "+919876543210" },
          dateofbirth: {
            type: "string",
            format: "date-time",
            example: "1998-05-14T18:15:00.000Z",
          },
          plan: {
            type: "string",
            enum: ["FREE", "PREMIUM"],
            example: "FREE",
          },
          created_at: {
            type: "string",
            format: "date-time",
            example: "2026-04-21T16:10:16.540Z",
          },
        },
        required: [
          "id",
          "fullname",
          "email",
          "phonenumber",
          "dateofbirth",
          "plan",
          "created_at",
        ],
      },
      AuthSuccessResponse: {
        type: "object",
        properties: {
          message: {
            type: "string",
            example: "Login successful",
          },
          token: {
            type: "string",
            description: "JWT access token",
            example:
              "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiZW1haWwiOiJ0ZXN0LnVzZXJAZXhhbXBsZS5jb20ifQ.signature",
          },
          user: {
            $ref: "#/components/schemas/User",
          },
        },
        required: ["message", "token", "user"],
      },
      ValidationErrorResponse: {
        type: "object",
        properties: {
          message: { type: "string", example: "Validation failed" },
          errors: {
            type: "array",
            items: { type: "string" },
            example: ["email format is invalid"],
          },
        },
        required: ["message", "errors"],
      },
      MessageResponse: {
        type: "object",
        properties: {
          message: { type: "string" },
        },
        required: ["message"],
      },
    },
    responses: {
      TooManyRequests: {
        description: "Rate limit exceeded",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/MessageResponse",
            },
            example: {
              message: "Too many auth attempts. Try again later.",
            },
          },
        },
      },
      InternalServerError: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/MessageResponse",
            },
            example: {
              message: "Internal server error",
            },
          },
        },
      },
    },
  },
};

module.exports = openApiSpec;
