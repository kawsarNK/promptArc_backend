import mongoose from "mongoose";
import { HttpError } from "../utils/http-error.js";

export const notFound = (req, _res, next) => next(new HttpError(404, `Route not found: ${req.method} ${req.path}`));

export const errorHandler = (error, _req, res, _next) => {
  void _next;
  const frameworkStatus = Number(error?.status || error?.statusCode);
  let status = error instanceof HttpError
    ? error.status
    : Number.isInteger(frameworkStatus) && frameworkStatus >= 400 && frameworkStatus <= 599
      ? frameworkStatus
      : 500;
  let message = error instanceof Error ? error.message : "Unexpected server error";

  if (error instanceof SyntaxError && error?.type === "entity.parse.failed") {
    status = 400;
    message = "Request body contains invalid JSON";
  }
  else if (error instanceof mongoose.Error.ValidationError) {
    status = 400;
    message = Object.values(error.errors).map((item) => item.message).join(", ");
  }
  else if (error instanceof mongoose.Error.CastError) {
    status = 400;
    message = "Invalid record identifier";
  }
  else if (error?.code === 11000) {
    status = 409;
    message = "That record already exists";
  }
  else if (["JsonWebTokenError", "TokenExpiredError", "NotBeforeError"].includes(error?.name)) {
    status = 401;
    message = error.name === "TokenExpiredError" ? "Your session has expired" : "Invalid authentication token";
  }
  else if (error?.code === "LIMIT_FILE_SIZE") {
    status = 413;
    message = "Image must be 5 MB or smaller";
  }
  else if (error?.name === "MulterError") {
    status = 400;
    message = "The uploaded image could not be processed";
  }
  else if (error?.type === "entity.too.large") {
    status = 413;
    message = "Request body is too large";
  }

  if (process.env.NODE_ENV !== "production")
    console.error(error);
  else if (status >= 500)
    message = "Unexpected server error";
  res.status(status).json({ message });
};
