import { Router } from "express";
import { allowRoles, requireAuth } from "../middleware/auth.js";
import { Payment } from "../models/Payment.js";
import { Prompt } from "../models/Prompt.js";
import { Report } from "../models/Report.js";
import { Review } from "../models/Review.js";
import { User } from "../models/User.js";
import { asyncHandler } from "../utils/async-handler.js";
import { deletePromptTree, deleteUserContent } from "../utils/delete-records.js";
import { HttpError } from "../utils/http-error.js";
import { createNotification } from "../utils/notifications.js";

export const adminRouter = Router();
adminRouter.use(requireAuth, allowRoles("admin"));

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}


function reportForClient(value) {
  const report = typeof value?.toObject === "function" ? value.toObject() : { ...value };
  const populatedPrompt = report.prompt && typeof report.prompt === "object" && report.prompt.title
    ? report.prompt
    : null;
  const populatedUser = report.user && typeof report.user === "object" && report.user.name
    ? report.user
    : null;
  const prompt = populatedPrompt || (report.promptId || report.promptTitle ? {
    _id: report.promptId || String(report.prompt || ""),
    title: report.promptTitle || "Removed prompt",
    creator: {
      name: report.promptCreatorName || "Deleted creator",
      email: report.promptCreatorEmail || "",
    },
    removed: true,
  } : null);
  const user = populatedUser || {
    name: report.reporterName || "Deleted account",
    email: report.reporterEmail || "",
    removed: true,
  };
  return { ...report, prompt, user };
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
    };
  });
}

adminRouter.get("/analytics", asyncHandler(async (req, res) => {
  const months = rangeFrom(req.query.range);
  const start = startOfRange(months);
  const [totalUsers, totalPrompts, totalReviews, copyStats, bookmarkStats, revenue, growth, toolShare, pendingPrompts, openReports] = await Promise.all([
    User.countDocuments(),
    Prompt.countDocuments(),
    Review.countDocuments(),
    Prompt.aggregate([{ $group: { _id: null, total: { $sum: "$copyCount" } } }]),
    Prompt.aggregate([{ $group: { _id: null, total: { $sum: "$bookmarkCount" } } }]),
    Payment.aggregate([{ $match: { status: "paid" } }, { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }]),
    Prompt.aggregate([
      { $match: { createdAt: { $gte: start } } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          prompts: { $sum: 1 },
          copies: { $sum: "$copyCount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),
    Prompt.aggregate([
      { $match: { status: "approved" } },
      { $group: { _id: "$aiTool", value: { $sum: 1 } } },
      { $sort: { value: -1 } },
    ]),
    Prompt.countDocuments({ status: "pending" }),
    Report.countDocuments({ status: "open" }),
  ]);
  res.json({
    totalUsers,
    totalPrompts,
    totalReviews,
    totalCopies: copyStats[0]?.total || 0,
    totalBookmarks: bookmarkStats[0]?.total || 0,
    pendingPrompts,
    openReports,
    revenue: revenue[0] || { total: 0, count: 0 },
    growth: monthlySeries(growth, months),
    toolShare: toolShare.map(({ _id, value }) => ({ label: _id, value })),
    range: months,
  });
}));

adminRouter.get("/users", asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
  const filter = {};
  if (req.query.role)
    filter.role = String(req.query.role);
  if (req.query.status)
    filter.status = String(req.query.status);
  if (req.query.search) {
    const pattern = new RegExp(escapeRegex(req.query.search), "i");
    filter.$or = [{ name: pattern }, { email: pattern }];
  }
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments(filter),
  ]);
  res.json({ users, page, pages: Math.max(1, Math.ceil(total / limit)), total });
}));

adminRouter.patch("/users/:id/role", asyncHandler(async (req, res) => {
  const role = String(req.body.role);
  if (!["user", "creator", "admin"].includes(role))
    throw new HttpError(400, "Invalid role");
  if (req.params.id === req.user.id && role !== "admin")
    throw new HttpError(400, "You cannot remove your own administrator role");
  const user = await User.findById(req.params.id);
  if (!user)
    throw new HttpError(404, "User not found");
  if (user.role === "admin" && user.status === "active" && role !== "admin" && await User.countDocuments({ role: "admin", status: "active" }) <= 1)
    throw new HttpError(409, "At least one active administrator must remain");
  user.role = role;
  await user.save();
  if (user.id !== req.user.id) {
    await createNotification({
      recipient: user._id,
      actor: req.user._id,
      type: "role-updated",
      title: "Account role updated",
      message: `Your PromptArc role is now ${role}.`,
      link: "/dashboard",
    });
  }
  res.json({ user, message: "Role updated" });
}));

adminRouter.patch("/users/:id/status", asyncHandler(async (req, res) => {
  const status = String(req.body.status);
  if (!["active", "suspended"].includes(status))
    throw new HttpError(400, "Invalid account status");
  if (req.params.id === req.user.id && status !== "active")
    throw new HttpError(400, "You cannot suspend your own administrator account");
  const user = await User.findById(req.params.id);
  if (!user)
    throw new HttpError(404, "User not found");
  if (user.role === "admin" && user.status === "active" && status === "suspended" && await User.countDocuments({ role: "admin", status: "active" }) <= 1)
    throw new HttpError(409, "At least one active administrator must remain");
  user.status = status;
  await user.save();
  if (status === "active" && user.id !== req.user.id) {
    await createNotification({
      recipient: user._id,
      actor: req.user._id,
      type: "account-reactivated",
      title: "Account reactivated",
      message: "Your PromptArc account is active again.",
      link: "/dashboard",
    });
  }
  res.json({ user, message: status === "active" ? "User activated" : "User suspended" });
}));

adminRouter.delete("/users/:id", asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id)
    throw new HttpError(400, "You cannot delete your own administrator account");
  const user = await User.findById(req.params.id);
  if (!user)
    throw new HttpError(404, "User not found");
  if (user.role === "admin" && user.status === "active" && await User.countDocuments({ role: "admin", status: "active" }) <= 1)
    throw new HttpError(409, "At least one active administrator must remain");
  await deleteUserContent(user._id);
  await user.deleteOne();
  res.json({ message: "User and related content deleted" });
}));

adminRouter.get("/prompts", asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
  const filter = {};
  if (req.query.status)
    filter.status = String(req.query.status);
  if (req.query.aiTool)
    filter.aiTool = String(req.query.aiTool);
  if (req.query.search) {
    const pattern = new RegExp(escapeRegex(req.query.search), "i");
    filter.$or = [{ title: pattern }, { description: pattern }, { category: pattern }, { aiTool: pattern }, { tags: pattern }];
  }
  const [prompts, total] = await Promise.all([
    Prompt.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("creator", "name email photoURL")
      .lean(),
    Prompt.countDocuments(filter),
  ]);
  res.json({ prompts: prompts.filter((prompt) => prompt.creator), page, pages: Math.max(1, Math.ceil(total / limit)), total });
}));

adminRouter.patch("/prompts/:id/moderate", asyncHandler(async (req, res) => {
  const status = String(req.body.status);
  const feedback = String(req.body.feedback || "").trim();
  if (!["approved", "rejected"].includes(status))
    throw new HttpError(400, "Choose approved or rejected");
  if (status === "rejected" && !feedback)
    throw new HttpError(400, "Rejection feedback is required");
  const prompt = await Prompt.findById(req.params.id);
  if (!prompt)
    throw new HttpError(404, "Prompt not found");
  prompt.status = status;
  prompt.rejectionFeedback = status === "rejected" ? feedback : undefined;
  await prompt.save();
  await createNotification({
    recipient: prompt.creator,
    actor: req.user._id,
    type: `prompt-${status}`,
    title: status === "approved" ? "Prompt approved" : "Prompt needs changes",
    message: status === "approved" ? `“${prompt.title}” is now live.` : `“${prompt.title}” was rejected: ${feedback}`,
    link: `/dashboard/my-prompts`,
  });
  res.json({ prompt, message: `Prompt ${status}` });
}));

adminRouter.patch("/prompts/:id/feature", asyncHandler(async (req, res) => {
  const prompt = await Prompt.findById(req.params.id);
  if (!prompt)
    throw new HttpError(404, "Prompt not found");
  if (prompt.status !== "approved")
    throw new HttpError(400, "Only approved prompts can be featured");
  prompt.featured = !prompt.featured;
  await prompt.save();
  res.json({ prompt, message: prompt.featured ? "Prompt featured" : "Prompt unfeatured" });
}));

adminRouter.delete("/prompts/:id", asyncHandler(async (req, res) => {
  const prompt = await Prompt.findById(req.params.id);
  if (!prompt)
    throw new HttpError(404, "Prompt not found");
  await createNotification({
    recipient: prompt.creator,
    actor: req.user._id,
    type: "prompt-removed",
    title: "Prompt removed",
    message: `“${prompt.title}” was removed by moderation.`,
    link: "/dashboard/my-prompts",
  });
  await deletePromptTree(prompt._id);
  res.json({ message: "Prompt removed" });
}));

adminRouter.get("/payments", asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
  const filter = {};
  if (req.query.status)
    filter.status = String(req.query.status);
  if (req.query.search) {
    const pattern = new RegExp(escapeRegex(req.query.search), "i");
    filter.$or = [{ email: pattern }, { stripeSessionId: pattern }, { paymentIntentId: pattern }];
  }
  const [payments, total, revenueRows] = await Promise.all([
    Payment.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate("user", "name email").lean(),
    Payment.countDocuments(filter),
    Payment.aggregate([{ $match: { status: "paid" } }, { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }]),
  ]);
  res.json({ payments, page, pages: Math.max(1, Math.ceil(total / limit)), total, revenue: revenueRows[0] || { total: 0, count: 0 } });
}));

adminRouter.get("/reports", asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
  const filter = {};
  if (req.query.status && req.query.status !== "all") {
    const status = String(req.query.status);
    if (!["open", "warned", "removed", "dismissed"].includes(status))
      throw new HttpError(400, "Invalid report status");
    filter.status = status;
  }
  if (req.query.search) {
    const pattern = new RegExp(escapeRegex(req.query.search), "i");
    const userIds = await User.find({ $or: [{ name: pattern }, { email: pattern }] }).distinct("_id");
    const promptIds = await Prompt.find({
      $or: [
        { title: pattern },
        { category: pattern },
        { aiTool: pattern },
        ...(userIds.length ? [{ creator: { $in: userIds } }] : []),
      ],
    }).distinct("_id");
    filter.$or = [
      { reason: pattern },
      { description: pattern },
      { promptTitle: pattern },
      { promptCreatorName: pattern },
      { promptCreatorEmail: pattern },
      { reporterName: pattern },
      { reporterEmail: pattern },
      ...(userIds.length ? [{ user: { $in: userIds } }] : []),
      ...(promptIds.length ? [{ prompt: { $in: promptIds } }] : []),
    ];
  }
  const [reports, total] = await Promise.all([
    Report.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("user", "name email photoURL")
      .populate({ path: "prompt", populate: { path: "creator", select: "name email photoURL" } })
      .lean(),
    Report.countDocuments(filter),
  ]);
  res.json({ reports: reports.map(reportForClient), page, pages: Math.max(1, Math.ceil(total / limit)), total });
}));

adminRouter.patch("/reports/:id", asyncHandler(async (req, res) => {
  const action = String(req.body.action);
  if (!["warned", "removed", "dismissed"].includes(action))
    throw new HttpError(400, "Invalid report action");
  const report = await Report.findById(req.params.id)
    .populate("user", "name email photoURL")
    .populate({ path: "prompt", populate: { path: "creator", select: "name email photoURL" } });
  if (!report)
    throw new HttpError(404, "Report not found");
  if (report.status !== "open")
    throw new HttpError(409, "This report has already been resolved");

  if (report.prompt) {
    report.promptId ||= String(report.prompt._id);
    report.promptTitle ||= report.prompt.title;
    report.promptCreatorName ||= report.prompt.creator?.name || "Deleted creator";
    report.promptCreatorEmail ||= report.prompt.creator?.email || "";
  }
  if (report.user) {
    report.reporterName ||= report.user.name;
    report.reporterEmail ||= report.user.email;
  }
  report.status = action;
  await report.save();

  if (action === "warned" && report.prompt?.creator) {
    await createNotification({
      recipient: report.prompt.creator._id,
      actor: req.user._id,
      type: "creator-warning",
      title: "Moderation warning",
      message: `A report about “${report.prompt.title}” was reviewed. Please verify that the prompt follows marketplace guidelines.`,
      link: `/prompts/${report.prompt._id}`,
    });
  }
  if (action === "removed" && report.prompt) {
    if (report.prompt.creator) {
      await createNotification({
        recipient: report.prompt.creator._id,
        actor: req.user._id,
        type: "prompt-removed",
        title: "Prompt removed after a report",
        message: `“${report.prompt.title}” was removed after a moderation review.`,
        link: "/dashboard/my-prompts",
      });
    }
    await deletePromptTree(report.prompt._id, { preserveReports: true });
  }

  if (report.user?._id && String(report.user._id) !== req.user.id) {
    const resolution = action === "removed"
      ? "The reported prompt was removed."
      : action === "warned"
        ? "The creator was warned after review."
        : "The report was reviewed and dismissed.";
    await createNotification({
      recipient: report.user._id,
      actor: req.user._id,
      type: `report-${action}`,
      title: "Your report was reviewed",
      message: `${report.promptTitle || report.prompt?.title || "The prompt"}: ${resolution}`,
      link: "/dashboard",
    });
  }

  const response = reportForClient(report);
  if (action === "removed" && response.prompt)
    response.prompt = { ...response.prompt, removed: true };
  res.json({ report: response, message: `Report ${action}` });
}));
