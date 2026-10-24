const productPaths = require("./swaggerProductPaths");
const cartPaths = require("./swaggerCartPaths");
const orderPaths = require("./swaggerOrderPaths");
const paymentPaths = require("./swaggerPaymentPaths");
const reviewPaths = require("./swaggerReviewPaths");
const categoryPaths = require("./swaggerCategory");

const swaggerSpec = {
  openapi: "3.0.0",
  info: {
    title: "Ecommerce Shop API",
    version: "1.0.0",
    description: "Ecommerce backend with auth, products, cart, orders and payment",
  },
  servers: [{ url: "http://localhost:8000/api/v1" }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
  tags: [
    { name: "Auth", description: "Authentication routes" },
    { name: "Category", description: "Product categories" },
    { name: "Product", description: "Products with images" },
    { name: "Cart", description: "Shopping cart (login required)" },
    { name: "Order", description: "Orders and checkout (login required)" },
    { name: "Payment", description: "Online payment with sslcommerz" },
    { name: "Review", description: "Product reviews and ratings" },
  ],
  paths: {
    ...productPaths,
    ...categoryPaths,
    ...cartPaths,
    ...orderPaths,
    ...paymentPaths,
    ...reviewPaths,
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user and send OTP",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password"],
                properties: {
                  name: { type: "string", example: "Rahim" },
                  email: { type: "string", example: "rahim@gmail.com" },
                  password: { type: "string", example: "123456" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Registered, OTP sent to email" },
          400: { description: "Missing or invalid fields" },
          409: { description: "Email already exists" },
        },
      },
    },
    "/auth/verify-otp": {
      post: {
        tags: ["Auth"],
        summary: "Verify email with OTP",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "otp"],
                properties: {
                  email: { type: "string", example: "rahim@gmail.com" },
                  otp: { type: "string", example: "123456" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Email verified" },
          400: { description: "Invalid or expired OTP" },
          404: { description: "User not found" },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login and get JWT token",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", example: "rahim@gmail.com" },
                  password: { type: "string", example: "123456" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Login successful, token returned" },
          401: { description: "Invalid email or password" },
          403: { description: "Email not verified" },
        },
      },
    },
    "/auth/forgot-password": {
      post: {
        tags: ["Auth"],
        summary: "Send password reset OTP",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: {
                  email: { type: "string", example: "rahim@gmail.com" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Reset OTP sent if email is registered" },
        },
      },
    },
    "/auth/reset-password": {
      post: {
        tags: ["Auth"],
        summary: "Reset password with OTP",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "otp", "newPassword"],
                properties: {
                  email: { type: "string", example: "rahim@gmail.com" },
                  otp: { type: "string", example: "123456" },
                  newPassword: { type: "string", example: "654321" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Password reset successfully" },
          400: { description: "Invalid or expired OTP" },
        },
      },
    },
    "/auth/change-password": {
      post: {
        tags: ["Auth"],
        summary: "Change password (login required)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["oldPassword", "newPassword"],
                properties: {
                  oldPassword: { type: "string", example: "123456" },
                  newPassword: { type: "string", example: "654321" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Password changed successfully" },
          401: { description: "Old password incorrect or no token" },
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get logged in user profile",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "User profile" },
          401: { description: "Token missing or invalid" },
        },
      },
    },
    "/auth/admin-check": {
      get: {
        tags: ["Auth"],
        summary: "Admin only test route",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "You are an admin" },
          401: { description: "Token missing or invalid" },
          403: { description: "Admin access only" },
        },
      },
    },
  },
};

module.exports = swaggerSpec;