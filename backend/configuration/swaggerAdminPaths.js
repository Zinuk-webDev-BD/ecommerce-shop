// swagger docs for admin apis
const adminPaths = {
  "/admin/stats": {
    get: {
      tags: ["Admin"],
      summary: "Dashboard numbers: users, orders, revenue, last 7 days, top products, low stock (admin only)",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "lowStock",
          in: "query",
          required: false,
          description: "products with this stock or less are low stock (default 5)",
          schema: { type: "integer", default: 5 },
        },
      ],
      responses: {
        200: { description: "dashboard stats" },
        401: { description: "token missing or invalid" },
        403: { description: "admin only" },
      },
    },
  },
};

module.exports = adminPaths;