// swagger docs for cart apis (all of them need login)
const productIdParam = {
  name: "productId",
  in: "path",
  required: true,
  schema: { type: "string" },
  description: "product id",
};

const cartPaths = {
  "/cart": {
    get: {
      tags: ["Cart"],
      summary: "Get my cart with total price (login required)",
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: "cart items, totalItems and totalPrice" },
        401: { description: "token missing or invalid" },
      },
    },
    post: {
      tags: ["Cart"],
      summary: "Add a product to cart, quantity increases if it is already there",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["productId"],
              properties: {
                productId: { type: "string", example: "PUT_PRODUCT_ID_HERE" },
                quantity: { type: "integer", example: 1 },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "added to cart" },
        400: { description: "bad quantity or not enough stock" },
        401: { description: "token missing or invalid" },
        404: { description: "product not found" },
      },
    },
    delete: {
      tags: ["Cart"],
      summary: "Remove everything from my cart",
      security: [{ bearerAuth: [] }],
      responses: {
        200: { description: "cart cleared" },
        401: { description: "token missing or invalid" },
      },
    },
  },
  "/cart/{productId}": {
    put: {
      tags: ["Cart"],
      summary: "Set a new quantity for a product in the cart",
      security: [{ bearerAuth: [] }],
      parameters: [productIdParam],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["quantity"],
              properties: {
                quantity: { type: "integer", example: 2 },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "cart updated" },
        400: { description: "bad quantity or not enough stock" },
        401: { description: "token missing or invalid" },
        404: { description: "product is not in your cart" },
      },
    },
    delete: {
      tags: ["Cart"],
      summary: "Remove one product from the cart",
      security: [{ bearerAuth: [] }],
      parameters: [productIdParam],
      responses: {
        200: { description: "removed from cart" },
        401: { description: "token missing or invalid" },
        404: { description: "product is not in your cart" },
      },
    },
  },
};

module.exports = cartPaths;