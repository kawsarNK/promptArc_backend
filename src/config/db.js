import mongoose from "mongoose";
import { env } from "./env.js";

let connectionPromise = null;

export async function connectDatabase() {
  // Already connected
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // Currently connecting
  if (mongoose.connection.readyState === 2 && connectionPromise) {
    await connectionPromise;
    return mongoose.connection;
  }

  if (!env.mongoUri) {
    throw new Error("MONGODB_URI is not configured");
  }

  try {
    connectionPromise = mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    });

    await connectionPromise;

    console.log("MongoDB connected");

    return mongoose.connection;
  } catch (error) {
    connectionPromise = null;

    console.error("MongoDB connection failed:", error.message);

    throw error;
  }
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  connectionPromise = null;
}