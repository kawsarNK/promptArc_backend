import { Notification } from "../models/Notification.js";
import { User } from "../models/User.js";

export async function createNotification({ recipient, actor, type, title, message, link }) {
  if (!recipient)
    return null;
  return Notification.create({ recipient, actor, type, title, message, link: link || "/dashboard" });
}

export async function notifyAdmins(payload) {
  const admins = await User.find({ role: "admin", status: "active" }).select("_id").lean();
  if (!admins.length)
    return [];
  return Notification.insertMany(admins.map(({ _id }) => ({ recipient: _id, ...payload })));
}
