import { model, Schema } from "mongoose";
const reviewSchema = new Schema({ prompt: { type: Schema.Types.ObjectId, ref: "Prompt", required: true, index: true }, user: { type: Schema.Types.ObjectId, ref: "User", required: true }, rating: { type: Number, min: 1, max: 5, required: true }, comment: { type: String, required: true, trim: true, maxlength: 1000 } }, { timestamps: true });
reviewSchema.index({ prompt: 1, user: 1 }, { unique: true });
export const Review = model("Review", reviewSchema);
