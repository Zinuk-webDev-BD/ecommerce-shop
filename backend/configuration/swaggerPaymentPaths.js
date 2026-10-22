// swagger docs for payment (the callback routes are for sslcommerz, so not shown here)
const paymentPaths = {
  "/payments/init/{orderId}": {
    post: {
      tags: ["Payment"],
      summary: "Start sslcommerz payment for my order, returns the payment page link",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "orderId",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "order id (the order must use paymentMethod sslcommerz)",
        },
      ],
      responses: {
        200: { description: "gatewayUrl to open in the browser" },
        400: { description: "not an online order, already paid or cancelled" },
        401: { description: "token missing or invalid" },
        404: { description: "order not found" },
        502: { description: "sslcommerz did not accept the request" },
      },
    },
  },
};

module.exports = paymentPaths;