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
    { name: "Modules", description: "Nested module management endpoints" },
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
                  $ref: "#/components/schemas/LoginSuccessResponse",
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
    "/auth/user-info": {
      get: {
        tags: ["Auth"],
        summary: "Get current user information",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "User info fetched",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/UserInfoResponse",
                },
              },
            },
          },
          401: {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/MessageResponse",
                },
                example: {
                  message: "Invalid or expired token",
                },
              },
            },
          },
          404: {
            description: "User not found",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/MessageResponse",
                },
                example: {
                  message: "User not found",
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
    "/auth/init": {
      get: {
        tags: ["Auth"],
        summary: "Get init payload with user and modules",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Init payload fetched",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/InitResponse",
                },
              },
            },
          },
          401: {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/MessageResponse",
                },
                example: {
                  message: "Invalid or expired token",
                },
              },
            },
          },
          404: {
            description: "User not found",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/MessageResponse",
                },
                example: {
                  message: "User not found",
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
    "/modules": {
      post: {
        tags: ["Modules"],
        summary: "Create a module tree",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ModuleCreateRequest",
              },
              example: {
                name: "User Management",
                icon: "User",
                path: null,
                code: "UM",
                moduleList: [
                  {
                    name: "Staff Management",
                    icon: "UsersRound",
                    path: "/staff-management",
                    code: "SM",
                    moduleList: [],
                  },
                  {
                    name: "Role Management",
                    icon: "UserRoundPen",
                    path: "/role-management",
                    code: "RM",
                    moduleList: [],
                  },
                ],
              },
            },
          },
        },
        responses: {
          201: {
            description: "Module created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: {
                      type: "string",
                      example: "Module created successfully",
                    },
                    module: {
                      $ref: "#/components/schemas/Module",
                    },
                  },
                  required: ["message", "module"],
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
            description: "Duplicate module code",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/MessageResponse",
                },
                example: {
                  message: "A module with this code already exists",
                },
              },
            },
          },
          401: {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/MessageResponse",
                },
                example: {
                  message: "Invalid or expired token",
                },
              },
            },
          },
          500: {
            $ref: "#/components/responses/InternalServerError",
          },
        },
      },
      get: {
        tags: ["Modules"],
        summary: "Get all modules as tree",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Modules fetched",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: {
                      type: "string",
                      example: "Modules fetched successfully",
                    },
                    modules: {
                      type: "array",
                      items: {
                        $ref: "#/components/schemas/Module",
                      },
                    },
                  },
                  required: ["message", "modules"],
                },
              },
            },
          },
          500: {
            $ref: "#/components/responses/InternalServerError",
          },
          401: {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/MessageResponse",
                },
                example: {
                  message: "Invalid or expired token",
                },
              },
            },
          },
        },
      },
    },
    "/modules/{id}": {
      get: {
        tags: ["Modules"],
        summary: "Get module tree by root id",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer", minimum: 1 },
          },
        ],
        responses: {
          200: {
            description: "Module fetched",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: {
                      type: "string",
                      example: "Module fetched successfully",
                    },
                    module: {
                      $ref: "#/components/schemas/Module",
                    },
                  },
                  required: ["message", "module"],
                },
              },
            },
          },
          400: {
            description: "Invalid id",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/MessageResponse",
                },
              },
            },
          },
          404: {
            description: "Module not found",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/MessageResponse",
                },
              },
            },
          },
          500: {
            $ref: "#/components/responses/InternalServerError",
          },
          401: {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/MessageResponse",
                },
                example: {
                  message: "Invalid or expired token",
                },
              },
            },
          },
        },
      },
      put: {
        tags: ["Modules"],
        summary: "Replace module tree by root id",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer", minimum: 1 },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ModuleCreateRequest",
              },
            },
          },
        },
        responses: {
          200: {
            description: "Module updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: {
                      type: "string",
                      example: "Module updated successfully",
                    },
                    module: {
                      $ref: "#/components/schemas/Module",
                    },
                  },
                  required: ["message", "module"],
                },
              },
            },
          },
          400: {
            description: "Validation failed or invalid id",
            content: {
              "application/json": {
                schema: {
                  oneOf: [
                    { $ref: "#/components/schemas/ValidationErrorResponse" },
                    { $ref: "#/components/schemas/MessageResponse" },
                  ],
                },
              },
            },
          },
          404: {
            description: "Module not found",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/MessageResponse",
                },
              },
            },
          },
          409: {
            description: "Duplicate module code",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/MessageResponse",
                },
              },
            },
          },
          500: {
            $ref: "#/components/responses/InternalServerError",
          },
          401: {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/MessageResponse",
                },
                example: {
                  message: "Invalid or expired token",
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ["Modules"],
        summary: "Delete module by id",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer", minimum: 1 },
          },
        ],
        responses: {
          200: {
            description: "Module deleted",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/MessageResponse",
                },
                example: {
                  message: "Module deleted successfully",
                },
              },
            },
          },
          400: {
            description: "Invalid id",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/MessageResponse",
                },
              },
            },
          },
          404: {
            description: "Module not found",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/MessageResponse",
                },
              },
            },
          },
          500: {
            $ref: "#/components/responses/InternalServerError",
          },
          401: {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/MessageResponse",
                },
                example: {
                  message: "Invalid or expired token",
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
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
      ModuleCreateRequest: {
        type: "object",
        required: ["name", "icon", "path", "code", "moduleList"],
        properties: {
          name: {
            type: "string",
            minLength: 1,
            maxLength: 120,
            example: "User Management",
          },
          icon: {
            type: "string",
            minLength: 1,
            maxLength: 80,
            example: "User",
          },
          path: {
            type: "string",
            nullable: true,
            maxLength: 255,
            example: null,
          },
          code: {
            type: "string",
            minLength: 1,
            maxLength: 30,
            pattern: "^[A-Z0-9_]+$",
            example: "UM",
          },
          moduleList: {
            type: "array",
            items: {
              $ref: "#/components/schemas/ModuleCreateRequest",
            },
            example: [],
          },
        },
      },
      Module: {
        type: "object",
        required: ["id", "name", "icon", "path", "code", "moduleList"],
        properties: {
          id: { type: "integer", example: 1 },
          name: { type: "string", example: "User Management" },
          icon: { type: "string", example: "User" },
          path: {
            type: "string",
            nullable: true,
            example: null,
          },
          code: { type: "string", example: "UM" },
          moduleList: {
            type: "array",
            items: {
              $ref: "#/components/schemas/Module",
            },
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
          accessToken: {
            type: "string",
            description: "JWT access token",
            example:
              "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiZW1haWwiOiJ0ZXN0LnVzZXJAZXhhbXBsZS5jb20ifQ.signature",
          },
          user: {
            $ref: "#/components/schemas/User",
          },
        },
        required: ["message", "accessToken", "user"],
      },
      LoginSuccessResponse: {
        type: "object",
        properties: {
          message: {
            type: "string",
            example: "Login successful",
          },
          accessToken: {
            type: "string",
            description: "JWT access token",
            example:
              "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.access.payload.signature",
          },
          refreshToken: {
            type: "string",
            description: "JWT refresh token",
            example:
              "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh.payload.signature",
          },
        },
        required: ["message", "accessToken", "refreshToken"],
      },
      UserInfoResponse: {
        type: "object",
        properties: {
          name: { type: "string", example: "Test User" },
          email: {
            type: "string",
            format: "email",
            example: "test.user@example.com",
          },
          dob: {
            type: "string",
            format: "date",
            example: "1998-05-15",
          },
          phoneNumber: {
            type: "string",
            example: "+919876543210",
          },
          panNumber: {
            type: "string",
            nullable: true,
            example: "ABCDE1234F",
          },
          locale: {
            type: "string",
            enum: ["en", "np"],
            example: "en",
          },
          plan: {
            type: "string",
            enum: ["FREE", "PREMIUM"],
            example: "FREE",
          },
        },
        required: [
          "name",
          "email",
          "dob",
          "phoneNumber",
          "panNumber",
          "locale",
          "plan",
        ],
      },
      InitResponse: {
        type: "object",
        properties: {
          statuscode: { type: "integer", example: 200 },
          message: { type: "string", example: "Initialization successful" },
          userDataa: {
            $ref: "#/components/schemas/UserInfoResponse",
          },
          moduleList: {
            type: "array",
            items: {
              $ref: "#/components/schemas/Module",
            },
          },
        },
        required: ["statuscode", "message", "userDataa", "moduleList"],
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
