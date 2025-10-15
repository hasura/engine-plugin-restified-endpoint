import express from "express";
import serverless from "serverless-http";
import { routeHandler } from "./handler";
import { config } from "./config";

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Main handler for all routes
app.all(
  "/",
  routeHandler(
    process.env.GRAPHQL_SERVER_URL || "http://localhost:3000/graphql",
    config,
  ),
);

export const handler = serverless(app);
