import bcrypt from "bcryptjs";
import { connectDatabase, disconnectDatabase } from "../config/db.js";
import { env } from "../config/env.js";
import { Bookmark } from "../models/Bookmark.js";
import { Notification } from "../models/Notification.js";
import { Payment } from "../models/Payment.js";
import { Prompt, makeSlug } from "../models/Prompt.js";
import { Report } from "../models/Report.js";
import { Review } from "../models/Review.js";
import { User } from "../models/User.js";

await connectDatabase();

try {
  await Promise.all([
    Bookmark.deleteMany({}),
    Notification.deleteMany({}),
    Payment.deleteMany({}),
    Report.deleteMany({}),
    Review.deleteMany({}),
    Prompt.deleteMany({}),
    User.deleteMany({}),
  ]);

  const memberHash = await bcrypt.hash("Creator123!", 12);
  const adminHash = await bcrypt.hash(env.adminPassword, 12);
  const [, nadia, ethan, maya, ari, member, samira, leo] = await User.create([
    {
      name: env.adminName,
      email: env.adminEmail,
      passwordHash: adminHash,
      role: "admin",
      subscription: "premium",
      bio: "PromptArc marketplace administrator.",
    },
    {
      name: "Nadia Rahman",
      email: "nadia@promptarc.dev",
      passwordHash: memberHash,
      role: "creator",
      subscription: "premium",
      bio: "Product strategist building practical AI workflows for clearer decisions.",
    },
    {
      name: "Ethan Cole",
      email: "ethan@promptarc.dev",
      passwordHash: memberHash,
      role: "creator",
      bio: "Engineering lead focused on research, debugging, and evidence-first systems.",
    },
    {
      name: "Maya Chen",
      email: "maya@promptarc.dev",
      passwordHash: memberHash,
      role: "creator",
      subscription: "premium",
      bio: "Visual prompt creator translating art direction into repeatable systems.",
    },
    {
      name: "Ari Mensah",
      email: "ari@promptarc.dev",
      passwordHash: memberHash,
      role: "creator",
      bio: "Brand and operations specialist turning messy inputs into reusable playbooks.",
    },
    {
      name: "Sample Member",
      email: "member@promptarc.dev",
      passwordHash: memberHash,
      role: "user",
      bio: "Exploring practical prompts for product and engineering work.",
    },
    {
      name: "Samira Ahmed",
      email: "samira@promptarc.dev",
      passwordHash: memberHash,
      role: "user",
      bio: "Learning designer testing prompts for clear and accessible instruction.",
    },
    {
      name: "Leo Martins",
      email: "leo@promptarc.dev",
      passwordHash: memberHash,
      role: "user",
      bio: "Growth specialist collecting useful research and marketing workflows.",
    },
  ]);

  const definitions = [
    [
      "Turn a messy brief into a sharp product strategy",
      "A structured copilot that maps opportunities and produces a decision-ready one-pager.",
      "Act as a senior product strategist. Extract the customer, problem, outcome, constraints, and unknowns from {{BRIEF}}. Ask five questions, then create a problem framing, opportunity map, three options, recommendation, and 30-day validation plan.",
      "Productivity",
      "ChatGPT",
      ["strategy", "product", "planning"],
      "Intermediate",
      "public",
      nadia,
      2847,
      true,
    ],
    [
      "Cinematic world-builder for Midjourney",
      "Compose visually coherent scenes with precise lighting, lens, palette, atmosphere, and narrative details.",
      "Create a cinematic still of {{SUBJECT}} in {{SETTING}}, visual tension: {{TENSION}}, shot on {{LENS}}, {{CAMERA ANGLE}}, lighting by {{LIGHT SOURCE}}, editorial color grade --ar 16:9 --stylize 250",
      "Design",
      "Midjourney",
      ["cinematic", "art direction", "visual"],
      "Pro",
      "private",
      maya,
      2310,
      true,
    ],
    [
      "Evidence-first research synthesizer",
      "Convert a source pack into findings, contradictions, confidence ratings, and recommendations.",
      "Work only from {{SOURCE PACK}}. Build an evidence table with claim, source, strength, limitations, and contradictions. Separate facts from inference, then write an executive synthesis with confidence labels.",
      "Research",
      "Claude",
      ["research", "evidence", "analysis"],
      "Intermediate",
      "public",
      ethan,
      1988,
      true,
    ],
    [
      "Build a reusable brand voice system",
      "Turn examples into a concrete voice guide, vocabulary map, and QA checklist.",
      "Analyze {{WRITING SAMPLES}} and infer a brand voice system: traits, rhythm, vocabulary to use and avoid, tone by channel, before/after examples, and a 10-point QA checklist.",
      "Marketing",
      "Gemini",
      ["brand", "copywriting", "voice"],
      "Beginner",
      "public",
      ari,
      1754,
      true,
    ],
    [
      "Root-cause debugging navigator",
      "Diagnose software defects systematically without jumping to the first plausible fix.",
      "From {{SYMPTOMS AND CODE}}, restate expected vs actual behavior, rank hypotheses, identify the smallest discriminating test, then propose the minimal fix, regression tests, and prevention note.",
      "Development",
      "ChatGPT",
      ["debugging", "engineering", "code"],
      "Pro",
      "public",
      ethan,
      1602,
      true,
    ],
    [
      "Adaptive lesson architect",
      "Design a lesson around learner level, misconceptions, retrieval practice, and outcomes.",
      "Design a {{DURATION}} lesson on {{TOPIC}} for {{LEARNER}} with prerequisite check, one objective, misconception forecast, worked example, guided practice, retrieval, transfer task, and exit ticket.",
      "Education",
      "Claude",
      ["teaching", "lesson", "learning"],
      "Beginner",
      "public",
      nadia,
      1441,
      true,
    ],
    [
      "Meeting notes to momentum",
      "Extract decisions, owners, deadlines, risks, and a follow-up message.",
      "Transform {{MEETING NOTES}} into decisions, actions with owner and due date, risks, unresolved questions, and a concise follow-up email. Flag missing information; do not invent it.",
      "Productivity",
      "Gemini",
      ["meetings", "actions", "operations"],
      "Beginner",
      "public",
      ari,
      1310,
      false,
    ],
    [
      "Landing page conversion lab",
      "Critique clarity, relevance, proof, friction, and motivation, then rewrite weak sections.",
      "Audit {{LANDING PAGE COPY}}. Score clarity, relevance, proof, friction, motivation, and accessibility. Identify three changes, then rewrite the hero, proof, and CTA while preserving voice.",
      "Marketing",
      "ChatGPT",
      ["conversion", "landing page", "cro"],
      "Intermediate",
      "private",
      maya,
      1195,
      false,
    ],
  ];

  const prompts = [];
  for (const [title, description, content, category, aiTool, tags, difficulty, visibility, creator, copyCount, featured] of definitions) {
    prompts.push(await Prompt.create({
      title,
      slug: makeSlug(title),
      description,
      content,
      category,
      aiTool,
      tags,
      difficulty,
      visibility,
      creator: creator._id,
      copyCount,
      featured,
      status: "approved",
      usageInstructions: "Replace every placeholder with concrete context. Run the full prompt once, then refine one variable at a time.",
    }));
  }

  await Bookmark.insertMany([
    { prompt: prompts[0]._id, user: member._id },
    { prompt: prompts[2]._id, user: member._id },
    { prompt: prompts[4]._id, user: member._id },
    { prompt: prompts[5]._id, user: member._id },
    { prompt: prompts[0]._id, user: samira._id },
    { prompt: prompts[1]._id, user: samira._id },
    { prompt: prompts[3]._id, user: samira._id },
    { prompt: prompts[6]._id, user: samira._id },
    { prompt: prompts[2]._id, user: leo._id },
    { prompt: prompts[3]._id, user: leo._id },
    { prompt: prompts[4]._id, user: leo._id },
    { prompt: prompts[1]._id, user: nadia._id },
    { prompt: prompts[2]._id, user: nadia._id },
    { prompt: prompts[0]._id, user: ethan._id },
    { prompt: prompts[3]._id, user: ethan._id },
    { prompt: prompts[4]._id, user: maya._id },
    { prompt: prompts[5]._id, user: maya._id },
    { prompt: prompts[2]._id, user: ari._id },
  ]);

  await Review.insertMany([
    { prompt: prompts[0]._id, user: member._id, rating: 5, comment: "The structure forces better thinking before the model starts writing." },
    { prompt: prompts[2]._id, user: member._id, rating: 5, comment: "The evidence table made disagreements in my source pack much easier to see." },
    { prompt: prompts[4]._id, user: member._id, rating: 4, comment: "Useful for slowing down a debugging session and testing the right hypothesis first." },
    { prompt: prompts[0]._id, user: samira._id, rating: 4, comment: "Clear steps and a practical output format that works well for workshops." },
    { prompt: prompts[3]._id, user: samira._id, rating: 5, comment: "The before-and-after examples made the voice guide immediately actionable." },
    { prompt: prompts[5]._id, user: samira._id, rating: 5, comment: "A strong lesson skeleton with good checks for misconceptions and transfer." },
    { prompt: prompts[2]._id, user: leo._id, rating: 4, comment: "Good separation of evidence, limitations, and inference." },
    { prompt: prompts[3]._id, user: leo._id, rating: 4, comment: "It produced a useful vocabulary map without flattening the original tone." },
    { prompt: prompts[6]._id, user: leo._id, rating: 5, comment: "Turned a noisy call transcript into a clean owner-and-deadline list." },
    { prompt: prompts[1]._id, user: nadia._id, rating: 5, comment: "The lens and lighting controls make the visual direction much more repeatable." },
    { prompt: prompts[2]._id, user: nadia._id, rating: 5, comment: "Excellent for executive synthesis when the sources disagree." },
    { prompt: prompts[7]._id, user: nadia._id, rating: 4, comment: "The scoring framework reveals weak proof and friction quickly." },
    { prompt: prompts[0]._id, user: ethan._id, rating: 5, comment: "A disciplined way to move from an ambiguous brief to testable options." },
    { prompt: prompts[3]._id, user: ethan._id, rating: 4, comment: "The QA checklist is especially useful for reviewing generated copy." },
    { prompt: prompts[5]._id, user: ethan._id, rating: 4, comment: "Well structured and easy to adapt to technical onboarding." },
    { prompt: prompts[0]._id, user: maya._id, rating: 5, comment: "The recommendation section keeps the output focused on a real decision." },
    { prompt: prompts[4]._id, user: maya._id, rating: 5, comment: "The smallest-test step helped isolate a defect without rewriting everything." },
    { prompt: prompts[6]._id, user: maya._id, rating: 4, comment: "Reliable follow-up format and a good reminder not to invent missing owners." },
    { prompt: prompts[2]._id, user: ari._id, rating: 5, comment: "Confidence labels keep the final recommendation honest and easy to review." },
    { prompt: prompts[4]._id, user: ari._id, rating: 4, comment: "A practical debugging flow even for non-engineers coordinating an incident." },
    { prompt: prompts[5]._id, user: ari._id, rating: 5, comment: "The exit ticket and transfer task make the lesson feel complete." },
  ]);

  const [reviewStats, bookmarkStats] = await Promise.all([
    Review.aggregate([
      { $group: { _id: "$prompt", averageRating: { $avg: "$rating" }, reviewCount: { $sum: 1 } } },
    ]),
    Bookmark.aggregate([
      { $group: { _id: "$prompt", bookmarkCount: { $sum: 1 } } },
    ]),
  ]);
  const reviewsByPrompt = new Map(reviewStats.map((row) => [String(row._id), row]));
  const bookmarksByPrompt = new Map(bookmarkStats.map((row) => [String(row._id), row.bookmarkCount]));

  await Prompt.bulkWrite(prompts.map((prompt) => {
    const review = reviewsByPrompt.get(String(prompt._id));
    return {
      updateOne: {
        filter: { _id: prompt._id },
        update: {
          $set: {
            averageRating: review?.averageRating || 0,
            reviewCount: review?.reviewCount || 0,
            bookmarkCount: bookmarksByPrompt.get(String(prompt._id)) || 0,
          },
        },
      },
    };
  }));

  console.log("Seed complete");
  console.log(`Admin: ${env.adminEmail}`);
  console.log("Creator: nadia@promptarc.dev / Creator123!");
  console.log("Member: member@promptarc.dev / Creator123!");
}
finally {
  await disconnectDatabase();
}
