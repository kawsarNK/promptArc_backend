import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import { Bookmark } from "../models/Bookmark.js";
import { Prompt, makeSlug } from "../models/Prompt.js";
import { Report } from "../models/Report.js";
import { Review } from "../models/Review.js";
import { User } from "../models/User.js";
import { asyncHandler } from "../utils/async-handler.js";
import { deletePromptTree } from "../utils/delete-records.js";
import { HttpError } from "../utils/http-error.js";
import { createNotification, notifyAdmins } from "../utils/notifications.js";

export const promptsRouter = Router();

const reportReasons = ["Inappropriate content", "Spam", "Copyright violation", "Misleading information"];

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanTags(tags) {
  const values = Array.isArray(tags) ? tags : String(tags || "").split(",");
  return [...new Set(values.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean))].slice(0, 12);
}

function canAccessPrivate(prompt, user) {
  return prompt.visibility !== "private"
    || user.subscription === "premium"
    || user.role === "admin"
    || String(prompt.creator?._id || prompt.creator) === user.id;
}

async function syncBookmarkCount(promptId) {
  const bookmarkCount = await Bookmark.countDocuments({ prompt: promptId });
  const prompt = await Prompt.findByIdAndUpdate(promptId, { bookmarkCount }, { new: true }).select("bookmarkCount");
  return prompt?.bookmarkCount || 0;
}

async function recalculateReviewStats(promptId) {
  const [stats] = await Review.aggregate([
    { $match: { prompt: new mongoose.Types.ObjectId(String(promptId)) } },
    { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  const prompt = await Prompt.findByIdAndUpdate(promptId, {
    averageRating: stats?.average || 0,
    reviewCount: stats?.count || 0,
  }, { new: true });
  return prompt;
}

promptsRouter.get("/featured", asyncHandler(async (_req, res) => {
  const prompts = await Prompt.find({ status: "approved" })
    .sort({ featured: -1, copyCount: -1, averageRating: -1, createdAt: -1 })
    .limit(6)
    .select("-content -usageInstructions -rejectionFeedback")
    .populate("creator", "name photoURL bio")
    .lean();
  res.json({ prompts: prompts.filter((prompt) => prompt.creator) });
}));

promptsRouter.get("/marketplace-stats", asyncHandler(async (_req, res) => {
  const [summaryRows, categoryRows, totalUsers] = await Promise.all([
    Prompt.aggregate([
      { $match: { status: "approved" } },
      {
        $group: {
          _id: null,
          totalPrompts: { $sum: 1 },
          totalCopies: { $sum: "$copyCount" },
          totalBookmarks: { $sum: "$bookmarkCount" },
          totalReviews: { $sum: "$reviewCount" },
          weightedRating: { $sum: { $multiply: ["$averageRating", "$reviewCount"] } },
        },
      },
    ]),
    Prompt.aggregate([
      { $match: { status: "approved", visibility: "public" } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ]),
    User.countDocuments({ status: "active" }),
  ]);
  const summary = summaryRows[0] || {};
  res.json({
    stats: {
      totalUsers,
      totalPrompts: summary.totalPrompts || 0,
      totalCopies: summary.totalCopies || 0,
      totalBookmarks: summary.totalBookmarks || 0,
      totalReviews: summary.totalReviews || 0,
      averageRating: summary.totalReviews ? summary.weightedRating / summary.totalReviews : 0,
    },
    categories: categoryRows.map(({ _id, count }) => ({ name: _id, count })),
  });
}));

promptsRouter.get("/top-creators", asyncHandler(async (_req, res) => {
  const creators = await Prompt.aggregate([
    { $match: { status: "approved" } },
    {
      $group: {
        _id: "$creator",
        promptCount: { $sum: 1 },
        totalCopies: { $sum: "$copyCount" },
        totalBookmarks: { $sum: "$bookmarkCount" },
        averageRating: { $avg: "$averageRating" },
      },
    },
    { $sort: { totalCopies: -1, promptCount: -1 } },
    { $limit: 8 },
    { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
    { $unwind: "$user" },
    { $match: { "user.status": "active" } },
    {
      $project: {
        _id: 1,
        name: "$user.name",
        photoURL: "$user.photoURL",
        bio: "$user.bio",
        role: "$user.role",
        promptCount: 1,
        totalCopies: 1,
        totalBookmarks: 1,
        averageRating: 1,
      },
    },
  ]);
  res.json({ creators });
}));

promptsRouter.get("/recent-reviews", asyncHandler(async (_req, res) => {
  const rows = await Review.find()
    .sort({ createdAt: -1 })
    .limit(12)
    .populate("user", "name photoURL")
    .populate({ path: "prompt", match: { status: "approved" }, select: "title slug" })
    .lean();
  res.json({ reviews: rows.filter((review) => review.user && review.prompt).slice(0, 6) });
}));

promptsRouter.get("/creators/:id", asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id))
    throw new HttpError(400, "Invalid creator identifier");
  const creator = await User.findOne({ _id: req.params.id, status: "active" })
    .select("name photoURL bio role subscription createdAt")
    .lean();
  if (!creator)
    throw new HttpError(404, "Creator not found");
  const [statsRows, prompts] = await Promise.all([
    Prompt.aggregate([
      { $match: { creator: creator._id, status: "approved" } },
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
    Prompt.find({ creator: creator._id, status: "approved" })
      .sort({ featured: -1, copyCount: -1, createdAt: -1 })
      .limit(12)
      .select("-content -usageInstructions -rejectionFeedback")
      .populate("creator", "name photoURL bio")
      .lean(),
  ]);
  const stats = statsRows[0] || {};
  res.json({
    creator,
    stats: {
      totalPrompts: stats.totalPrompts || 0,
      totalCopies: stats.totalCopies || 0,
      totalBookmarks: stats.totalBookmarks || 0,
      averageRating: stats.averageRating || 0,
    },
    prompts,
  });
}));

promptsRouter.get("/", asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(24, Math.max(1, Number(req.query.limit) || 9));
  const filter = { status: "approved", visibility: "public" };
  if (req.query.category)
    filter.category = String(req.query.category);
  if (req.query.aiTool)
    filter.aiTool = String(req.query.aiTool);
  if (req.query.difficulty)
    filter.difficulty = String(req.query.difficulty);
  if (req.query.search) {
    const pattern = new RegExp(escapeRegex(req.query.search), "i");
    filter.$or = [{ title: pattern }, { description: pattern }, { tags: pattern }, { aiTool: pattern }];
  }
  const sortBy = String(req.query.sort || "popular");
  const sort = sortBy === "copied"
    ? { copyCount: -1, createdAt: -1 }
    : sortBy === "latest"
      ? { createdAt: -1 }
      : { averageRating: -1, reviewCount: -1, copyCount: -1 };
  const [prompts, total] = await Promise.all([
    Prompt.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .select("-content -usageInstructions -rejectionFeedback")
      .populate("creator", "name photoURL bio")
      .lean(),
    Prompt.countDocuments(filter),
  ]);
  res.json({ prompts: prompts.filter((prompt) => prompt.creator), page, pages: Math.max(1, Math.ceil(total / limit)), total });
}));

promptsRouter.get("/:id", requireAuth, asyncHandler(async (req, res) => {
  const identifier = String(req.params.id || "");
  const query = mongoose.isValidObjectId(identifier)
    ? Prompt.findById(identifier)
    : Prompt.findOne({ slug: identifier });
  const prompt = await query.populate("creator", "name photoURL bio role status");
  if (!prompt || !prompt.creator)
    throw new HttpError(404, "Prompt not found");
  const isOwner = String(prompt.creator._id) === req.user.id;
  if (prompt.status !== "approved" && !isOwner && req.user.role !== "admin")
    throw new HttpError(404, "Prompt not found");
  const isLocked = !canAccessPrivate(prompt, req.user);
  const [bookmarked, reviews] = await Promise.all([
    Bookmark.exists({ prompt: prompt._id, user: req.user._id }),
    isLocked
      ? Promise.resolve([])
      : Review.find({ prompt: prompt._id }).sort({ createdAt: -1 }).limit(30).populate("user", "name email photoURL").lean(),
  ]);
  const data = prompt.toObject();
  if (isLocked) {
    data.content = "Premium prompt content is locked.";
    data.usageInstructions = "";
  }
  res.json({ prompt: { ...data, reviews, isBookmarked: Boolean(bookmarked), isLocked } });
}));

promptsRouter.post("/", requireAuth, asyncHandler(async (req, res) => {
  const { title, description, content, category, aiTool, difficulty, thumbnail, visibility, usageInstructions } = req.body;
  if (!title || !description || !content || !category || !aiTool || !difficulty)
    throw new HttpError(400, "Complete all required prompt fields");
  if (req.user.subscription === "free" && req.user.role !== "admin") {
    const count = await Prompt.countDocuments({ creator: req.user._id });
    if (count >= 3)
      throw new HttpError(403, "Free accounts can publish up to 3 prompts. Upgrade to add more.");
  }
  const status = req.user.role === "admin" ? "approved" : "pending";
  const prompt = await Prompt.create({
    title: String(title).trim(),
    slug: makeSlug(title),
    description: String(description).trim(),
    content: String(content),
    category: String(category).trim(),
    aiTool: String(aiTool).trim(),
    tags: cleanTags(req.body.tags),
    difficulty: String(difficulty),
    thumbnail: String(thumbnail || "").trim(),
    visibility: visibility === "private" ? "private" : "public",
    usageInstructions: String(usageInstructions || "").trim(),
    creator: req.user._id,
    status,
  });
  if (status === "pending") {
    await notifyAdmins({
      actor: req.user._id,
      type: "prompt-submitted",
      title: "Prompt awaiting moderation",
      message: `${req.user.name} submitted “${prompt.title}”.`,
      link: "/dashboard/all-prompts",
    });
  }
  res.status(201).json({ prompt, message: status === "approved" ? "Prompt published" : "Prompt submitted for moderation" });
}));

promptsRouter.patch("/:id", requireAuth, asyncHandler(async (req, res) => {
  const prompt = await Prompt.findById(req.params.id);
  if (!prompt)
    throw new HttpError(404, "Prompt not found");
  if (String(prompt.creator) !== req.user.id && req.user.role !== "admin")
    throw new HttpError(403, "You can only update your own prompts");
  const allowed = ["title", "description", "content", "category", "aiTool", "difficulty", "thumbnail", "visibility", "usageInstructions"];
  for (const key of allowed) {
    if (!(key in req.body))
      continue;
    if (key === "visibility")
      prompt.visibility = req.body.visibility === "private" ? "private" : "public";
    else if (key === "content")
      prompt.content = String(req.body.content || "");
    else
      prompt[key] = String(req.body[key] || "").trim();
  }
  if ("tags" in req.body)
    prompt.tags = cleanTags(req.body.tags);
  if (req.user.role !== "admin") {
    prompt.status = "pending";
    prompt.rejectionFeedback = undefined;
  }
  await prompt.save();
  if (req.user.role !== "admin") {
    await notifyAdmins({
      actor: req.user._id,
      type: "prompt-updated",
      title: "Updated prompt awaiting review",
      message: `${req.user.name} updated “${prompt.title}”.`,
      link: "/dashboard/all-prompts",
    });
  }
  res.json({ prompt, message: req.user.role === "admin" ? "Prompt updated" : "Prompt updated and resubmitted" });
}));

promptsRouter.delete("/:id", requireAuth, asyncHandler(async (req, res) => {
  const prompt = await Prompt.findById(req.params.id);
  if (!prompt)
    throw new HttpError(404, "Prompt not found");
  if (String(prompt.creator) !== req.user.id && req.user.role !== "admin")
    throw new HttpError(403, "You can only delete your own prompts");
  await deletePromptTree(prompt._id);
  res.json({ message: "Prompt deleted" });
}));

promptsRouter.post("/:id/copy", requireAuth, asyncHandler(async (req, res) => {
  const prompt = await Prompt.findOne({ _id: req.params.id, status: "approved" });
  if (!prompt)
    throw new HttpError(404, "Prompt not found");
  if (!canAccessPrivate(prompt, req.user))
    throw new HttpError(403, "Premium access is required");
  const updated = await Prompt.findByIdAndUpdate(prompt._id, { $inc: { copyCount: 1 } }, { new: true }).select("copyCount");
  res.json({ copyCount: updated.copyCount });
}));

promptsRouter.post("/:id/bookmark", requireAuth, asyncHandler(async (req, res) => {
  const prompt = await Prompt.findOne({ _id: req.params.id, status: "approved" });
  if (!prompt)
    throw new HttpError(404, "Prompt not found");
  const existing = await Bookmark.findOneAndDelete({ prompt: prompt._id, user: req.user._id });
  if (existing) {
    const bookmarkCount = await syncBookmarkCount(prompt._id);
    return res.json({ bookmarked: false, bookmarkCount });
  }
  try {
    await Bookmark.create({ prompt: prompt._id, user: req.user._id });
  }
  catch (error) {
    if (error?.code === 11000) {
      const bookmarkCount = await syncBookmarkCount(prompt._id);
      return res.json({ bookmarked: true, bookmarkCount });
    }
    throw error;
  }
  const bookmarkCount = await syncBookmarkCount(prompt._id);
  if (String(prompt.creator) !== req.user.id) {
    await createNotification({
      recipient: prompt.creator,
      actor: req.user._id,
      type: "bookmark",
      title: "Your prompt was saved",
      message: `${req.user.name} bookmarked “${prompt.title}”.`,
      link: `/prompts/${prompt._id}`,
    });
  }
  res.status(201).json({ bookmarked: true, bookmarkCount });
}));

promptsRouter.delete("/:id/bookmark", requireAuth, asyncHandler(async (req, res) => {
  const prompt = await Prompt.findOne({ _id: req.params.id, status: "approved" }).select("bookmarkCount");
  if (!prompt)
    throw new HttpError(404, "Prompt not found");
  const bookmark = await Bookmark.findOneAndDelete({ prompt: prompt._id, user: req.user._id });
  const bookmarkCount = await syncBookmarkCount(prompt._id);
  res.json({
    bookmarked: false,
    bookmarkCount,
    message: bookmark ? "Bookmark removed" : "Bookmark already removed",
  });
}));

promptsRouter.post("/:id/reviews", requireAuth, asyncHandler(async (req, res) => {
  const prompt = await Prompt.findOne({ _id: req.params.id, status: "approved" });
  if (!prompt)
    throw new HttpError(404, "Prompt not found");
  if (!canAccessPrivate(prompt, req.user))
    throw new HttpError(403, "Premium access is required to review this prompt");
  const rating = Number(req.body.rating);
  const comment = String(req.body.comment || "").trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !comment)
    throw new HttpError(400, "Rating and comment are required");
  const review = await Review.findOneAndUpdate(
    { prompt: prompt._id, user: req.user._id },
    { rating, comment },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  ).populate("user", "name email photoURL");
  const updatedPrompt = await recalculateReviewStats(prompt._id);
  if (String(prompt.creator) !== req.user.id) {
    await createNotification({
      recipient: prompt.creator,
      actor: req.user._id,
      type: "review",
      title: "New prompt review",
      message: `${req.user.name} rated “${prompt.title}” ${rating}/5.`,
      link: `/prompts/${prompt._id}`,
    });
  }
  res.status(201).json({
    review,
    averageRating: updatedPrompt.averageRating,
    reviewCount: updatedPrompt.reviewCount,
    message: "Review saved",
  });
}));

promptsRouter.delete("/:id/reviews/me", requireAuth, asyncHandler(async (req, res) => {
  const review = await Review.findOneAndDelete({ prompt: req.params.id, user: req.user._id });
  if (!review)
    throw new HttpError(404, "Review not found");
  const prompt = await recalculateReviewStats(req.params.id);
  res.json({
    averageRating: prompt?.averageRating || 0,
    reviewCount: prompt?.reviewCount || 0,
    message: "Review deleted",
  });
}));

promptsRouter.post("/:id/reports", requireAuth, asyncHandler(async (req, res) => {
  const prompt = await Prompt.findOne({ _id: req.params.id, status: "approved" })
    .select("title creator")
    .populate("creator", "name email");
  if (!prompt || !prompt.creator)
    throw new HttpError(404, "Prompt not found");
  const reason = String(req.body.reason || "");
  const description = String(req.body.description || "").trim();
  if (!reportReasons.includes(reason))
    throw new HttpError(400, "Choose a valid report reason");
  const report = await Report.findOneAndUpdate(
    { prompt: prompt._id, user: req.user._id, status: "open" },
    {
      reason,
      description,
      promptId: String(prompt._id),
      promptTitle: prompt.title,
      promptCreatorName: prompt.creator.name,
      promptCreatorEmail: prompt.creator.email,
      reporterName: req.user.name,
      reporterEmail: req.user.email,
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );
  await notifyAdmins({
    actor: req.user._id,
    type: "report",
    title: "Prompt reported",
    message: `“${prompt.title}” was reported for ${reason.toLowerCase()}.`,
    link: "/dashboard/reports",
  });
  res.status(201).json({ report, message: "Report submitted" });
}));
