const str = (example) => ({ type: "string", example });
const idParam = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "string" },
};

// a small helper for query parameters
const queryParam = (name, description, schema) => ({
  name,
  in: "query",
  required: false,
  description,
  schema,
});

// product apis for swagger
const productPaths = {
  "/products": {
    get: {
      tags: ["Product"],
      summary: "List products with search, filter, sort and pagination",
      parameters: [
        queryParam("search", "search in product name", { type: "string" }),
        queryParam("category", "category id", { type: "string" }),
        queryParam("minPrice", "minimum price", { type: "number" }),
        queryParam("maxPrice", "maximum price", { type: "number" }),
        queryParam("sort", "sort order", {
          type: "string",
          enum: ["newest", "price_asc", "price_desc"],
        }),
        queryParam("page", "page number (default 1)", { type: "integer", default: 1 }),
        queryParam("limit", "items per page (default 10, max 50)", { type: "integer", default: 10 }),
      ],
      responses: {
        200: { description: "products with page, total and totalPages" },
        400: { description: "invalid category id or price" },
      },
    },
    post: {
      tags: ["Product"],
      summary: "Create a product with images (admin only, max 5 images, 2MB each)",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              required: ["name", "price", "category"],
              properties: {
                name: str("Running Shoes"),
                description: str("Light and comfortable"),
                price: { type: "number", example: 2500 },
                stock: { type: "number", example: 20 },
                category: str("PUT_CATEGORY_ID_HERE"),
                images: {
                  type: "array",
                  items: { type: "string", format: "binary" },
                },
              },
            },
          },
        },
      },
      responses: {
        201: { description: "product created" },
        400: { description: "missing fields, bad price or wrong image" },
        401: { description: "token missing or invalid" },
        403: { description: "admin only" },
        404: { description: "category not found" },
      },
    },
  },
  "/products/{id}": {
    get: {
      tags: ["Product"],
      summary: "Get one product",
      parameters: [idParam],
      responses: { 200: { description: "product" }, 404: { description: "not found" } },
    },
    put: {
      tags: ["Product"],
      summary: "Update product fields (admin only, send only what changes)",
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                name: str("Running Shoes Pro"),
                description: str("New description"),
                price: { type: "number", example: 2800 },
                stock: { type: "number", example: 15 },
                isActive: { type: "boolean", example: true },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "product updated" },
        400: { description: "nothing to update or bad data" },
        403: { description: "admin only" },
        404: { description: "product not found" },
      },
    },
    delete: {
      tags: ["Product"],
      summary: "Delete a product and its images (admin only)",
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      responses: {
        200: { description: "product deleted" },
        403: { description: "admin only" },
        404: { description: "product not found" },
      },
    },
  },
};

module.exports = productPaths;