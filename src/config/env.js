import "dotenv/config";
function value(name, fallback = "") {
    return process.env[name]?.trim() || fallback;
}
export const env = {
    nodeEnv: value("NODE_ENV", "development"),
    port: Number(value("PORT", "5000")),
    clientUrl: value("CLIENT_URL", "http://localhost:3000"),
    mongoUri: value("MONGODB_URI", "mongodb://127.0.0.1:27017/promptarc"),
    jwtSecret: value("JWT_SECRET", "development-only-secret-change-before-deploying"),
    jwtExpiresIn: value("JWT_EXPIRES_IN", "7d"),
    googleClientId: value("GOOGLE_CLIENT_ID"),
    stripeSecretKey: value("STRIPE_SECRET_KEY"),
    stripeWebhookSecret: value("STRIPE_WEBHOOK_SECRET"),
    cloudinaryCloudName: value("CLOUDINARY_CLOUD_NAME"),
    cloudinaryApiKey: value("CLOUDINARY_API_KEY"),
    cloudinaryApiSecret: value("CLOUDINARY_API_SECRET"),
    adminName: value("ADMIN_NAME", "PromptArc Admin"),
    adminEmail: value("ADMIN_EMAIL", "admin@promptarc.dev"),
    adminPassword: value("ADMIN_PASSWORD", "ChangeMe123!"),
};
if (env.nodeEnv === "production" && (env.jwtSecret.includes("development-only") || env.jwtSecret.length < 32)) {
    throw new Error("JWT_SECRET must be a unique value of at least 32 characters in production");
}
if (!Number.isInteger(env.port) || env.port < 1 || env.port > 65535) {
    throw new Error("PORT must be a valid TCP port number");
}
