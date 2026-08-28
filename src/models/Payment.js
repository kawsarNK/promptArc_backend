import { model, Schema } from "mongoose";
const paymentSchema = new Schema({ user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true }, email: { type: String, required: true, lowercase: true }, stripeSessionId: { type: String, required: true, unique: true }, paymentIntentId: String, amount: { type: Number, required: true }, currency: { type: String, default: "usd" }, status: { type: String, enum: ["paid", "pending", "failed"], default: "pending" } }, { timestamps: true });
export const Payment = model("Payment", paymentSchema);
