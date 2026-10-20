// swagger docs for category apis
const idParam = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "string" },
  description: "category id",
};

const jsonBody = (properties, required) => ({
  required: true,
  content: {
    "application/json": {
      schema: { type: "object", required, properties },
    },
  },
});

const categoryPaths = {
  "/categories": {
    get: {
      tags: ["Category"],
      summary: "Get all categories (public)",
      responses: {
        200: { description: "list of categories" },
      },
    },
    post: {
      tags: ["Category"],
      summary: "Create a category (admin only)",
      security: [{ bearerAuth: [] }],
      requestBody: jsonBody(
        {
          name: { type: "string", example: "Shoes" },
          description: { type: "string", example: "All kinds of shoes" },
        },
        ["name"]
      ),
      responses: {
        201: { description: "category created" },
        400: { description: "name is required" },
        401: { description: "token missing or invalid" },
        403: { description: "admin access only" },
        409: { description: "category already exists" },
      },
    },
  },
  "/categories/{id}": {
    get: {
      tags: ["Category"],
      summary: "Get one category by id (public)",
      parameters: [idParam],
      responses: {
        200: { description: "category data" },
        400: { description: "invalid category id" },
        404: { description: "category not found" },
      },
    },
    put: {
      tags: ["Category"],
      summary: "Update a category (admin only)",
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      requestBody: jsonBody(
        {
          name: { type: "string", example: "Men Shoes" },
          description: { type: "string", example: "Shoes for men" },
        },
        []
      ),
      responses: {
        200: { description: "category updated" },
        401: { description: "token missing or invalid" },
        403: { description: "admin access only" },
        404: { description: "category not found" },
        409: { description: "category already exists" },
      },
    },
    delete: {
      tags: ["Category"],
      summary: "Delete a category (admin only)",
      security: [{ bearerAuth: [] }],
      parameters: [idParam],
      responses: {
        200: { description: "category deleted" },
        401: { description: "token missing or invalid" },
        403: { description: "admin access only" },
        404: { description: "category not found" },
      },
    },
  },
};

module.exports = categoryPaths;