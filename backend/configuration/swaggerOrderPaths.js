// swagger docs for order apis
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
                paymentMethod: { type: "string", enum: ["cod"], example: "cod" },
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
  },
};

module.exports = orderPaths;