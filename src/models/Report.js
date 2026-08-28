import { model, Schema } from "mongoose";

const reportSchema = new Schema({
  prompt: { type: Schema.Types.ObjectId, ref: "Prompt", required: true, index: true },
  promptId: { type: String, trim: true, index: true },
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  reason: { type: String, enum: ["Inappropriate content", "Spam", "Copyright violation", "Misleading information"], required: true },
  description: { type: String, maxlength: 1200 },
  status: { type: String, enum: ["open", "warned", "removed", "dismissed"], default: "open", index: true },
  promptTitle: { type: String, trim: true, maxlength: 140 },
  promptCreatorName: { type: String, trim: true, maxlength: 80 },
  promptCreatorEmail: { type: String, trim: true, lowercase: true, maxlength: 320 },
  reporterName: { type: String, trim: true, maxlength: 80 },
  reporterEmail: { type: String, trim: true, lowercase: true, maxlength: 320 },
}, { timestamps: true });

reportSchema.index({ createdAt: -1, status: 1 });

export const Report = model("Report", reportSchema);
