import { Router } from "express";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { env } from "../config/env.js";
import { requireAuth } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import { createNotification } from "../utils/notifications.js";
import { signToken } from "../utils/token.js";

export const authRouter = Router();
const google = new OAuth2Client(env.googleClientId);

function sessionResponse(user) {
  return { token: signToken(user.id), user: user.toJSON() };
}

function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320)
    throw new HttpError(400, "Enter a valid email address");
  return email;
}

function validatePassword(value) {
  const password = String(value || "");
  if (password.length < 8 || password.length > 128 || !/[A-Z]/.test(password) || !/\d/.test(password))
    throw new HttpError(400, "Password must have 8-128 characters, one uppercase letter, and one number");
  return password;
}

function cleanProfile(body) {
  const name = String(body.name || "").trim();
  const photoURL = String(body.photoURL || "").trim();
  const bio = String(body.bio || "").trim();
  if (!name)
    throw new HttpError(400, "Display name is required");
  if (name.length > 80)
    throw new HttpError(400, "Display name must be 80 characters or fewer");
  if (bio.length > 500)
    throw new HttpError(400, "Bio must be 500 characters or fewer");
  return { name, photoURL, bio };
}

async function welcome(user) {
  await createNotification({
    recipient: user._id,
    type: "welcome",
    title: "Welcome to PromptArc",
    message: "Your workspace is ready. Save a prompt or publish your first prompt to get started.",
    link: "/dashboard",
  });
}

authRouter.post("/register", asyncHandler(async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = normalizeEmail(req.body.email);
  const password = validatePassword(req.body.password);
  const photoURL = String(req.body.photoURL || "").trim();
  if (!name)
    throw new HttpError(400, "Name is required");
  if (name.length > 80)
    throw new HttpError(400, "Name must be 80 characters or fewer");
  if (photoURL.length > 1000)
    throw new HttpError(400, "Photo URL is too long");
  if (await User.exists({ email }))
    throw new HttpError(409, "An account already exists for this email");
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    name,
    email,
    photoURL,
    passwordHash,
    role: "user",
  });
  await welcome(user);
  res.status(201).json(sessionResponse(user));
}));

authRouter.post("/login", asyncHandler(async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  if (!email || !password)
    throw new HttpError(400, "Email and password are required");
  const user = await User.findOne({ email }).select("+passwordHash");
  if (!user || !(await user.comparePassword(password)))
    throw new HttpError(401, "Invalid email or password");
  if (user.status === "suspended")
    throw new HttpError(403, "This account is suspended. Contact an administrator for help.");
  res.json(sessionResponse(user));
}));

authRouter.post("/google", asyncHandler(async (req, res) => {
  if (!env.googleClientId)
    throw new HttpError(503, "Google login is not configured");
  const credential = String(req.body.credential || "");
  if (!credential)
    throw new HttpError(400, "Google credential is required");
  let ticket;
  try {
    ticket = await google.verifyIdToken({ idToken: credential, audience: env.googleClientId });
  }
  catch {
    throw new HttpError(401, "Google sign-in credential is invalid or expired");
  }
  const payload = ticket.getPayload();
  if (!payload?.email || !payload.email_verified)
    throw new HttpError(401, "Google account email is not verified");
  let user = await User.findOne({ email: payload.email.toLowerCase() });
  const created = !user;
  if (!user) {
    user = await User.create({
      name: payload.name || payload.email.split("@")[0],
      email: payload.email.toLowerCase(),
      photoURL: payload.picture,
      googleId: payload.sub,
      role: "user",
    });
  }
  else if (!user.googleId) {
    user.googleId = payload.sub;
    user.photoURL ||= payload.picture;
    await user.save();
  }
  if (user.status === "suspended")
    throw new HttpError(403, "This account is suspended. Contact an administrator for help.");
  if (created)
    await welcome(user);
  res.json(sessionResponse(user));
}));

authRouter.get("/me", requireAuth, asyncHandler(async (req, res) => {
  res.json({ user: req.user.toJSON() });
}));

authRouter.patch("/me", requireAuth, asyncHandler(async (req, res) => {
  const profile = cleanProfile(req.body);
  Object.assign(req.user, profile);
  await req.user.save();
  res.json({ user: req.user.toJSON(), message: "Profile updated" });
}));
