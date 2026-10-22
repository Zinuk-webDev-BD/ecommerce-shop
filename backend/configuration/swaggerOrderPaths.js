// swagger docs for order apis (all of them need login)
const idParam = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "string" },
  description: "order id",
};

const queryParam = (name, description, schema) => ({
  name,
  in: "query",
  required: false,
  description,
  schema,
});

const orderPaths = {
  "/orders": {
    post: {
      tags: ["Order"],
      summary: "Place an order from my cart (login required)",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["name", "phone", "address", "city"],
              properties: {
                name: { type: "string", example: "Zinuk" },
                phone: { type: "string", example: "01712345678" },
                address: { type: "string", example: "House 10, Road 5, Mirpur" },
                city: { type: "string", example: "Dhaka" },
                paymentMethod: { type: "string", enum: ["cod", "sslcommerz"], example: "sslcommerz" },
              },
            },
          },
        },
      },
      responses: {
        201: { description: "order placed" },
        400: { description: "empty cart, bad data or not enough stock" },
        401: { description: "token missing or invalid" },
      },
    },
    get: {
      tags: ["Order"],
      summary: "All orders with status filter and pagination (admin only)",
      security: [{ bearerAuth: [] }],
      parameters: [
        queryParam("status", "filter by order status", {
          type: "string",
          enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
        }),
        queryParam("page", "page number (default 1)", { type: "integer", default: 1 }),
        queryParam("limit", "items per page (default 10, max 50)", { type: "integer", default: 10 }),
      ],
      responses: {
        200: { description: "orders with page, total and totalPages" },
        400: { description: "invalid status" },
        401: { description: "token missing or invalid" },
        403: { description: "admin only" },
      },
    },
  },
  "/orders/my": {
    get: {
      tags: ["Order"],
      summary: "My order history, newest first (login required)",
      security: [{ bearerAuth: [] }],
      parameters: [
        queryParam("page", "page number (default 1)", { type: "integer", default: 1 }),
        queryParam("limit", "items per page (default 10, max 50)", { type: "integer", default: 10 }),
      ],
      responses: {
        200: { description: "my orders with page, total and totalPages" },
        401: { description: "token missing or invalid" },
      },
    },
  },
  "/orders/{id}": {
    get: {
      tags: ["Order"],
      summary: "Get one order (owner or admin)",
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      responses: {
        200: { description: "order details" },
        400: { description: "invalid order id" },
        401: { description: "token missing or invalid" },
        404: { description: "order not found" },
      },
    },
  },
  "/orders/{id}/cancel": {
    put: {
      tags: ["Order"],
      summary: "Cancel my order (only while pending, stock is given back)",
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      responses: {
        200: { description: "order cancelled" },
        400: { description: "only pending orders can be cancelled" },
        401: { description: "token missing or invalid" },
        404: { description: "order not found" },
      },
    },
  },
  "/orders/{id}/status": {
    put: {
      tags: ["Order"],
      summary: "Change order status step by step (admin only)",
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["status"],
              properties: {
                status: {
                  type: "string",
                  enum: ["processing", "shipped", "delivered", "cancelled"],
                  example: "processing",
                },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "order status updated" },
        400: { description: "invalid status or not allowed from current status" },
        403: { description: "admin only" },
        404: { description: "order not found" },
        409: { description: "status was changed by someone else" },
      },
    },
  },
};

module.exports = orderPaths;