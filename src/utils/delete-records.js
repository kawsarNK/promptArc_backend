import { Bookmark } from "../models/Bookmark.js";
import { Notification } from "../models/Notification.js";
import { Prompt } from "../models/Prompt.js";
import { Report } from "../models/Report.js";
import { Review } from "../models/Review.js";

export async function deletePromptTree(promptId, { preserveReports = false } = {}) {
  const tasks = [
    Review.deleteMany({ prompt: promptId }),
    Bookmark.deleteMany({ prompt: promptId }),
    Prompt.deleteOne({ _id: promptId }),
  ];
  if (!preserveReports)
    tasks.push(Report.deleteMany({ prompt: promptId }));
  await Promise.all(tasks);
}

async function refreshReviewCounters(promptIds) {
  if (!promptIds.length)
    return;
  const rows = await Review.aggregate([
    { $match: { prompt: { $in: promptIds } } },
    { $group: { _id: "$prompt", averageRating: { $avg: "$rating" }, reviewCount: { $sum: 1 } } },
  ]);
  const values = new Map(rows.map((row) => [String(row._id), row]));
  await Prompt.bulkWrite(promptIds.map((promptId) => {
    const row = values.get(String(promptId));
    return {
      updateOne: {
        filter: { _id: promptId },
        update: { $set: { averageRating: row?.averageRating || 0, reviewCount: row?.reviewCount || 0 } },
      },
    };
  }), { ordered: false });
}

async function refreshBookmarkCounters(promptIds) {
  if (!promptIds.length)
    return;
  const rows = await Bookmark.aggregate([
    { $match: { prompt: { $in: promptIds } } },
    { $group: { _id: "$prompt", bookmarkCount: { $sum: 1 } } },
  ]);
  const values = new Map(rows.map((row) => [String(row._id), row.bookmarkCount]));
  await Prompt.bulkWrite(promptIds.map((promptId) => ({
    updateOne: {
      filter: { _id: promptId },
      update: { $set: { bookmarkCount: values.get(String(promptId)) || 0 } },
    },
  })), { ordered: false });
}

export async function deleteUserContent(userId) {
  const [prompts, reviewedPromptIds, bookmarkedPromptIds] = await Promise.all([
    Prompt.find({ creator: userId }).select("_id").lean(),
    Review.distinct("prompt", { user: userId }),
    Bookmark.distinct("prompt", { user: userId }),
  ]);
  const ownedIds = prompts.map(({ _id }) => _id);
  const ownedSet = new Set(ownedIds.map(String));
  const reviewIdsToRefresh = reviewedPromptIds.filter((id) => !ownedSet.has(String(id)));
  const bookmarkIdsToRefresh = bookmarkedPromptIds.filter((id) => !ownedSet.has(String(id)));

  await Promise.all([
    ownedIds.length ? Review.deleteMany({ prompt: { $in: ownedIds } }) : Promise.resolve(),
    ownedIds.length ? Bookmark.deleteMany({ prompt: { $in: ownedIds } }) : Promise.resolve(),
    ownedIds.length ? Report.deleteMany({ prompt: { $in: ownedIds } }) : Promise.resolve(),
    ownedIds.length ? Prompt.deleteMany({ _id: { $in: ownedIds } }) : Promise.resolve(),
    Review.deleteMany({ user: userId }),
    Bookmark.deleteMany({ user: userId }),
    Report.deleteMany({ user: userId }),
    Notification.deleteMany({ $or: [{ recipient: userId }, { actor: userId }] }),
  ]);

  await Promise.all([
    refreshReviewCounters(reviewIdsToRefresh),
    refreshBookmarkCounters(bookmarkIdsToRefresh),
  ]);
}
