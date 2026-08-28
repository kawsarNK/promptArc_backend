import { model, Schema } from "mongoose";
const bookmarkSchema = new Schema({ prompt: { type: Schema.Types.ObjectId, ref: "Prompt", required: true }, user: { type: Schema.Types.ObjectId, ref: "User", required: true } }, { timestamps: true });
bookmarkSchema.index({ prompt: 1, user: 1 }, { unique: true });
export const Bookmark = model("Bookmark", bookmarkSchema);
