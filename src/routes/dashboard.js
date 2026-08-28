import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { Bookmark } from "../models/Bookmark.js";
import { Notification } from "../models/Notification.js";
import { Payment } from "../models/Payment.js";
import { Prompt } from "../models/Prompt.js";
import { Report } from "../models/Report.js";
import { Review } from "../models/Review.js";
import { User } from "../models/User.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function rangeFrom(value) {
  return Number(value) === 12 ? 12 : 6;
}

function startOfRange(months) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months + 1, 1));
}

function monthlySeries(rows, months) {
  const byMonth = new Map(rows.map((row) => [`${row._id.year}-${row._id.month}`, row]));
  const formatter = new Intl.DateTimeFormat("en", { month: "short" });
  const now = new Date();
  return Array.from({ length: months }, (_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months + index + 1, 1));
    const row = byMonth.get(`${date.getUTCFullYear()}-${date.getUTCMonth() + 1}`) || {};
    return {
      label: formatter.format(date),
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      prompts: row.prompts || 0,
      copies: row.copies || 0,
      bookmarks: row.bookmarks || 0,
      users: row.users || 0,
    };
  });
}

async function notificationRows(userId, limit = 5) {
  return Notification.find({ recipient: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("actor", "name photoURL")
    .lean();
}

async function personalOverview(req, months) {
  const userId = req.user._id;
  const start = startOfRange(months);
  const [creatorRows, savedCount, reviewCount, chartRows, topPrompts, recentPrompts, activities, toolRows] = await Promise.all([
    Prompt.aggregate([
      { $match: { creator: userId } },
      {
        $group: {
          _id: null,
          totalPrompts: { $sum: 1 },
          totalCopies: { $sum: "$copyCount" },
          totalBookmarks: { $sum: "$bookmarkCount" },
          averageRating: { $avg: "$averageRating" },
        },
      },
    ]),
    Bookmark.countDocuments({ user: userId }),
    Review.countDocuments({ user: userId }),
    Prompt.aggregate([
      { $match: { creator: userId, createdAt: { $gte: start } } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          prompts: { $sum: 1 },
          copies: { $sum: "$copyCount" },
          bookmarks: { $sum: "$bookmarkCount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),
    Prompt.find({ creator: userId }).sort({ copyCount: -1, averageRating: -1 }).limit(5).lean(),
    Prompt.find({ creator: userId }).sort({ createdAt: -1 }).limit(5).lean(),
    notificationRows(userId),
    Prompt.aggregate([
      { $match: { creator: userId } },
      { $group: { _id: "$aiTool", value: { $sum: 1 } } },
      { $sort: { value: -1 } },
    ]),
  ]);
  const creator = creatorRows[0] || {};
  return {
    stats: {
      totalPrompts: creator.totalPrompts || 0,
      totalCopies: creator.totalCopies || 0,
      totalBookmarks: creator.totalBookmarks || 0,
      averageRating: creator.averageRating || 0,
      savedCount,
      reviewCount,
    },
    chart: monthlySeries(chartRows, months),
    topPrompts,
    recentPrompts,
    activities,
    toolShare: toolRows.map(({ _id, value }) => ({ label: _id, value })),
  };
}

async function adminOverview(req, months) {
  const start = startOfRange(months);
  const [
    totalUsers,
    totalPrompts,
    totalReviews,
    copyRows,
    bookmarkRows,
    pendingPrompts,
    openReports,
    revenueRows,
    chartRows,
    topPrompts,
    recentPrompts,
    activities,
    toolRows,
  ] = await Promise.all([
    User.countDocuments(),
    Prompt.countDocuments(),
    Review.countDocuments(),
    Prompt.aggregate([{ $group: { _id: null, total: { $sum: "$copyCount" } } }]),
    Prompt.aggregate([{ $group: { _id: null, total: { $sum: "$bookmarkCount" } } }]),
    Prompt.countDocuments({ status: "pending" }),
    Report.countDocuments({ status: "open" }),
    Payment.aggregate([{ $match: { status: "paid" } }, { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }]),
    Prompt.aggregate([
      { $match: { createdAt: { $gte: start } } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          prompts: { $sum: 1 },
          copies: { $sum: "$copyCount" },
          bookmarks: { $sum: "$bookmarkCount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),
    Prompt.find().sort({ copyCount: -1, averageRating: -1 }).limit(5).populate("creator", "name email").lean(),
    Prompt.find().sort({ createdAt: -1 }).limit(5).populate("creator", "name email").lean(),
    notificationRows(req.user._id),
    Prompt.aggregate([
      { $match: { status: "approved" } },
      { $group: { _id: "$aiTool", value: { $sum: 1 } } },
      { $sort: { value: -1 } },
    ]),
  ]);
  return {
    stats: {
      totalUsers,
      totalPrompts,
      totalReviews,
      totalCopies: copyRows[0]?.total || 0,
      totalBookmarks: bookmarkRows[0]?.total || 0,
      pendingPrompts,
      openReports,
      revenue: revenueRows[0] || { total: 0, count: 0 },
    },
    chart: monthlySeries(chartRows, months),
    topPrompts,
    recentPrompts,
    activities,
    toolShare: toolRows.map(({ _id, value }) => ({ label: _id, value })),
  };
}

dashboardRouter.get("/", asyncHandler(async (req, res) => {
  const months = rangeFrom(req.query.range);
  const payload = req.user.role === "admin"
    ? await adminOverview(req, months)
    : await personalOverview(req, months);
  res.json({ ...payload, range: months });
}));

dashboardRouter.get("/my-prompts", asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
  const filter = { creator: req.user._id };
  if (req.query.status)
    filter.status = String(req.query.status);
  if (req.query.search) {
    const pattern = new RegExp(escapeRegex(req.query.search), "i");
    filter.$or = [{ title: pattern }, { category: pattern }, { aiTool: pattern }, { tags: pattern }];
  }
  const [prompts, total] = await Promise.all([
    Prompt.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Prompt.countDocuments(filter),
  ]);
  res.json({ prompts, page, pages: Math.max(1, Math.ceil(total / limit)), total });
}));

dashboardRouter.get("/saved", asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 12));
  const filter = { user: req.user._id };
  if (req.query.search) {
    const pattern = new RegExp(escapeRegex(req.query.search), "i");
    const promptIds = await Prompt.find({
      $or: [{ title: pattern }, { description: pattern }, { category: pattern }, { aiTool: pattern }, { tags: pattern }],
    }).distinct("_id");
    filter.prompt = { $in: promptIds };
  }
  const [bookmarks, total] = await Promise.all([
    Bookmark.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({ path: "prompt", populate: { path: "creator", select: "name photoURL bio" } })
      .lean(),
    Bookmark.countDocuments(filter),
  ]);
  const prompts = bookmarks.map((item) => item.prompt).filter(Boolean);
  res.json({ prompts, page, pages: Math.max(1, Math.ceil(total / limit)), total });
}));

dashboardRouter.get("/reviews", asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
  const filter = { user: req.user._id };
  if (req.query.search) {
    const pattern = new RegExp(escapeRegex(req.query.search), "i");
    const promptIds = await Prompt.find({ $or: [{ title: pattern }, { aiTool: pattern }] }).distinct("_id");
    filter.prompt = { $in: promptIds };
  }
  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .sort({ updatedAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("prompt", "title slug aiTool visibility")
      .lean(),
    Review.countDocuments(filter),
  ]);
  res.json({ reviews: reviews.filter((review) => review.prompt), page, pages: Math.max(1, Math.ceil(total / limit)), total });
}));

dashboardRouter.get("/notifications", asyncHandler(async (req, res) => {
  const limit = Math.min(30, Math.max(1, Number(req.query.limit) || 10));
  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("actor", "name photoURL")
      .lean(),
    Notification.countDocuments({ recipient: req.user._id, readAt: null }),
  ]);
  res.json({ notifications, unreadCount });
}));

dashboardRouter.patch("/notifications/read", asyncHandler(async (req, res) => {
  await Notification.updateMany({ recipient: req.user._id, readAt: null }, { $set: { readAt: new Date() } });
  res.json({ unreadCount: 0, message: "Notifications marked as read" });
}));

dashboardRouter.patch("/notifications/:id/read", asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user._id },
    { $set: { readAt: new Date() } },
    { new: true },
  );
  if (!notification)
    throw new HttpError(404, "Notification not found");
  res.json({ notification });
}));
