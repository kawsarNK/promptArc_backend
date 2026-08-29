import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { env } from "./config/env.js";
import { connectDatabase } from "./config/db.js";

import {
  errorHandler,
  notFound,
} from "./middleware/error.js";

import { adminRouter } from "./routes/admin.js";
import { authRouter } from "./routes/auth.js";
import { dashboardRouter } from "./routes/dashboard.js";

import {
  paymentWebhook,
  paymentsRouter,
} from "./routes/payments.js";

import { promptsRouter } from "./routes/prompts.js";
import { uploadsRouter } from "./routes/uploads.js";

export const app = express();

/* --------------------------------------------------------------------------
   Allowed frontend origins
   -------------------------------------------------------------------------- */

const normalizeOrigin = (url) =>
  String(url || "")
    .trim()
    .replace(/\/+$/, "");

const allowedOrigins = new Set([
  "http://localhost:3000",
  "https://prompt-arc-frontend.vercel.app",

  ...String(env.clientUrl || "")
    .split(",")
    .map(normalizeOrigin)
    .filter(Boolean),
]);

console.log("Allowed CORS origins:", [...allowedOrigins]);

const corsOptions = {
  origin(origin, callback) {
    // Allow requests such as Postman, server-to-server calls, curl, etc.
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = normalizeOrigin(origin);

    if (allowedOrigins.has(normalizedOrigin)) {
      return callback(null, true);
    }

    console.error("Blocked by CORS:", normalizedOrigin);

    return callback(
      new Error(`CORS blocked origin: ${normalizedOrigin}`)
    );
  },

  credentials: true,

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept",
  ],

  optionsSuccessStatus: 204,
};

app.set("trust proxy", 1);

/* --------------------------------------------------------------------------
   Security
   -------------------------------------------------------------------------- */

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

/* --------------------------------------------------------------------------
   CORS

   IMPORTANT:
   This comes BEFORE database middleware and routes so OPTIONS/preflight
   requests don't need MongoDB.
   -------------------------------------------------------------------------- */

app.use(cors(corsOptions));

/* --------------------------------------------------------------------------
   Stripe webhook

   Must be BEFORE express.json()
   -------------------------------------------------------------------------- */

app.post(
  "/api/payments/webhook",
  express.raw({
    type: "application/json",
  }),
  paymentWebhook
);

/* --------------------------------------------------------------------------
   Request parsing
   -------------------------------------------------------------------------- */

app.use(
  express.json({
    limit: "1mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb",
  })
);

app.use(cookieParser());

/* --------------------------------------------------------------------------
   Logging
   -------------------------------------------------------------------------- */

if (env.nodeEnv !== "test") {
  app.use(
    morgan(
      env.nodeEnv === "production"
        ? "combined"
        : "dev"
    )
  );
}

/* --------------------------------------------------------------------------
   Root route

   This fixes:
   {"message":"Route not found: GET /"}
   -------------------------------------------------------------------------- */

app.get("/", (_req, res) => {
  res.status(200).json({
    message: "PromptArc API is running",
    service: "promptarc-api",
  });
});

/* --------------------------------------------------------------------------
   Basic health route

   Does not require MongoDB.
   -------------------------------------------------------------------------- */

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "promptarc-api",
    timestamp: new Date().toISOString(),
  });
});

/* --------------------------------------------------------------------------
   Database middleware

   Every real API request waits for MongoDB before running.
   -------------------------------------------------------------------------- */

async function databaseMiddleware(req, res, next) {
  // OPTIONS preflight should never wait for MongoDB
  if (req.method === "OPTIONS") {
    return next();
  }

  try {
    await connectDatabase();
    return next();
  } catch (error) {
    console.error(
      "Database middleware error:",
      error.message
    );

    return res.status(503).json({
      message:
        "Database connection failed. Check MongoDB configuration.",
    });
  }
}

app.use("/api", databaseMiddleware);

/* --------------------------------------------------------------------------
   Database health check
   -------------------------------------------------------------------------- */

app.get("/api/health/database", (_req, res) => {
  res.status(200).json({
    status: "ok",
    database: "connected",
  });
});

/* --------------------------------------------------------------------------
   Rate limiting
   -------------------------------------------------------------------------- */

app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  })
);

app.use(
  "/api/auth",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 40,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
  authRouter
);

/* --------------------------------------------------------------------------
   API routes
   -------------------------------------------------------------------------- */

app.use("/api/prompts", promptsRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/uploads", uploadsRouter);
app.use("/api/admin", adminRouter);

/* --------------------------------------------------------------------------
   404
   -------------------------------------------------------------------------- */

app.use(notFound);

/* --------------------------------------------------------------------------
   Error handler
   -------------------------------------------------------------------------- */

app.use(errorHandler);

/* --------------------------------------------------------------------------
   Vercel
   -------------------------------------------------------------------------- */

export default app;