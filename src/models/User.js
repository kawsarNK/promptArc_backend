import bcrypt from "bcryptjs";
import { model, Schema } from "mongoose";

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  photoURL: { type: String, trim: true, maxlength: 1000 },
  bio: { type: String, trim: true, maxlength: 500, default: "" },
  passwordHash: { type: String, select: false },
  googleId: { type: String, sparse: true, unique: true },
  role: { type: String, enum: ["user", "creator", "admin"], default: "user", index: true },
  status: { type: String, enum: ["active", "suspended"], default: "active", index: true },
  subscription: { type: String, enum: ["free", "premium"], default: "free" },
  premiumSince: Date,
}, {
  timestamps: true,
  toJSON: {
    transform(_doc, ret) {
      delete ret.passwordHash;
      return ret;
    },
  },
});

userSchema.methods.comparePassword = function comparePassword(password) {
  return this.passwordHash ? bcrypt.compare(password, this.passwordHash) : Promise.resolve(false);
};

export const User = model("User", userSchema);
