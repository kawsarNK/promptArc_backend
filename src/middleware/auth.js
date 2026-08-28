import { User } from "../models/User.js";
import { HttpError } from "../utils/http-error.js";
import { verifyToken } from "../utils/token.js";
import { asyncHandler } from "../utils/async-handler.js";

function tokenFrom(req) {
  const authorization = req.get("authorization");
  if (authorization?.startsWith("Bearer "))
    return authorization.slice(7);
  return req.cookies?.promptarc_token;
}

async function userFromToken(token) {
  const payload = verifyToken(token);
  const user = await User.findById(payload.sub);
  if (!user)
    throw new HttpError(401, "Account no longer exists");
  if (user.status === "suspended")
    throw new HttpError(403, "This account is suspended. Contact an administrator for help.");
  return user;
}

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = tokenFrom(req);
  if (!token)
    throw new HttpError(401, "Authentication required");
  req.user = await userFromToken(token);
  next();
});

export const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = tokenFrom(req);
  if (!token)
    return next();
  try {
    req.user = await userFromToken(token);
  }
  catch {
    // Public routes deliberately ignore invalid optional credentials.
  }
  next();
});

export function allowRoles(...roles) {
  return (req, _res, next) => {
    if (!req.user)
      return next(new HttpError(401, "Authentication required"));
    if (!roles.includes(req.user.role))
      return next(new HttpError(403, "You do not have permission to perform this action"));
    next();
  };
}
