// swagger docs for review apis
const productIdParam = {
  name: "productId",
  in: "path",
  required: true,
  schema: { type: "string" },
  description: "product id",
};

const idParam = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "string" },
  description: "review id",
};

const reviewPaths = {
  "/products/{productId}/reviews": {
    get: {
      tags: ["Review"],
      summary: "Reviews of a product with average rating (public)",
      parameters: [
        productIdParam,
        { name: "page", in: "query", required: false, schema: { type: "integer", default: 1 } },
        { name: "limit", in: "query", required: false, schema: { type: "integer", default: 10 } },
      ],
      responses: {
        200: { description: "reviews, ratingAverage and ratingCount" },
        404: { description: "product not found" },
      },
    },
    post: {
      tags: ["Review"],
      summary: "Review a product (only after it was delivered to you, one review per product)",
      security: [{ bearerAuth: [] }],
      parameters: [productIdParam],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["rating"],
              properties: {
                rating: { type: "integer", minimum: 1, maximum: 5, example: 5 },
                comment: { type: "string", example: "Very comfortable shoes" },
              },
            },
          },
        },
      },
      responses: {
        201: { description: "review added" },
        400: { description: "bad rating or comment" },
        401: { description: "token missing or invalid" },
        403: { description: "this product was not delivered to you" },
        404: { description: "product not found" },
        409: { description: "you already reviewed this product" },
      },
    },
  },
  "/reviews/{id}": {
    put: {
      tags: ["Review"],
      summary: "Change my own review",
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                rating: { type: "integer", minimum: 1, maximum: 5, example: 4 },
                comment: { type: "string", example: "Good, but a little tight" },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "review updated" },
        400: { description: "bad rating or nothing to update" },
        401: { description: "token missing or invalid" },
        404: { description: "review not found" },
      },
    },
    delete: {
      tags: ["Review"],
      summary: "Delete a review (owner or admin)",
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      responses: {
        200: { description: "review deleted" },
        401: { description: "token missing or invalid" },
        404: { description: "review not found" },
      },
    },
  },
};

module.exports = reviewPaths;