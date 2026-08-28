import { model, Schema } from "mongoose";
const promptSchema = new Schema({
    title: { type: String, required: true, trim: true, maxlength: 140 },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String, required: true, trim: true, maxlength: 500 },
    content: { type: String, required: true, maxlength: 20000 },
    category: { type: String, required: true, trim: true, maxlength: 80, index: true },
    aiTool: { type: String, required: true, trim: true, maxlength: 80, index: true },
    tags: [{ type: String, trim: true, lowercase: true, maxlength: 40 }],
    difficulty: { type: String, enum: ["Beginner", "Intermediate", "Pro"], required: true },
    thumbnail: { type: String, trim: true, maxlength: 1000 },
    visibility: { type: String, enum: ["public", "private"], default: "public" },
    creator: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    copyCount: { type: Number, default: 0, min: 0 },
    bookmarkCount: { type: Number, default: 0, min: 0 },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
    rejectionFeedback: { type: String, trim: true, maxlength: 1000 },
    featured: { type: Boolean, default: false, index: true },
    usageInstructions: { type: String, trim: true, maxlength: 2000 },
}, { timestamps: true });
promptSchema.index({ title: "text", tags: "text", aiTool: "text", description: "text" });
promptSchema.index({ status: 1, category: 1, aiTool: 1, difficulty: 1, createdAt: -1 });
export function makeSlug(title) {
    return `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 64)}-${Math.random().toString(36).slice(2, 7)}`;
}
export const Prompt = model("Prompt", promptSchema);
