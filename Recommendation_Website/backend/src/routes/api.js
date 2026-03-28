const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const express = require("express");
const router = express.Router();

const { calculateRecommendation } = require("../services/recommendationEngine");

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  return [];
}

function toBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const lowered = value.trim().toLowerCase();
    return lowered === "yes" || lowered === "true" || lowered === "1";
  }
  return !!value;
}

// 1. Save Assessment
router.post("/assessment", async (req, res) => {
  try {
    const {
      age,
      gender,
      height,
      weight,
      occupation_type,
      diet_breakfast,
      diet_lunch,
      diet_dinner,
      diet_snacks,
      diet_snacks_time,
      bed_time,
      wake_up_time,
      water_glasses,
      exercise_info,
      eye_condition,
      wears_spectacles,
      health_goals,
      conditions,
      symptoms,
      goals,
    } = req.body;

    const parsedAge =
      age === undefined || age === null || age === "" ? 0 : parseInt(age, 10);
    const parsedHeight =
      height === undefined || height === null || height === ""
        ? 0
        : parseFloat(height);
    const parsedWeight =
      weight === undefined || weight === null || weight === ""
        ? 0
        : parseFloat(weight);
    const parsedWaterGlasses =
      water_glasses === undefined ||
      water_glasses === null ||
      water_glasses === ""
        ? 0
        : parseInt(water_glasses, 10);

    const user = await prisma.user.create({
      data: {
        age: Number.isFinite(parsedAge) ? parsedAge : 0,
        gender: gender || "",
        height: Number.isFinite(parsedHeight) ? parsedHeight : 0,
        weight: Number.isFinite(parsedWeight) ? parsedWeight : 0,
        occupation_type: occupation_type || "",
        diet_breakfast: diet_breakfast || "",
        diet_lunch: diet_lunch || "",
        diet_dinner: diet_dinner || "",
        diet_snacks: diet_snacks || "",
        diet_snacks_time: diet_snacks_time || "",
        bed_time: bed_time || "",
        wake_up_time: wake_up_time || "",
        water_glasses: Number.isFinite(parsedWaterGlasses)
          ? parsedWaterGlasses
          : 0,
        exercise_info: exercise_info || "",
        eye_condition: eye_condition || "",
        wears_spectacles: !!wears_spectacles,
        health_goals: health_goals || "",
        conditions: {
          create: normalizeList(conditions).map((condition) => ({
            condition_name: condition,
          })),
        },
        symptoms: {
          create: normalizeList(symptoms).map((symptom) => ({
            symptom_name: symptom,
          })),
        },
        goals: {
          create: normalizeList(goals).map((goal) => ({
            goal_name: goal,
          })),
        },
      },
      include: {
        conditions: true,
        symptoms: true,
        goals: true,
      },
    });

    res.json({ success: true, userId: user.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Failed to save assessment",
      details: error.message,
    });
  }
});

// 2. Save Lead Collection Details
router.post("/leads", async (req, res) => {
  try {
    const { userId, name, email, phone } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    await prisma.user.update({
      where: { id: parseInt(userId, 10) },
      data: { name, email, phone },
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to save lead information" });
  }
});

// 3. Calculate and Save Recommendation
router.post("/recommendation", async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId, 10) },
      include: { conditions: true, symptoms: true, goals: true },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    const recommendation = await calculateRecommendation(user);
    res.json(recommendation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to calculate recommendation" });
  }
});

// 4. Get Recommendation Results
router.get("/recommendation/:userId", async (req, res) => {
  try {
    const recommendation = await prisma.recommendation.findFirst({
      where: { userId: parseInt(req.params.userId, 10) },
      orderBy: { createdAt: "desc" },
    });

    if (!recommendation) return res.status(404).json({ error: "Not found" });
    res.json(recommendation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch recommendation" });
  }
});

// 5. Admin Dashboard Analytics
router.get("/admin/dashboard", async (_req, res) => {
  try {
    const totalAssessments = await prisma.user.count();
    const withEmails = await prisma.user.count({
      where: { email: { not: null } },
    });

    const conditions = await prisma.userCondition.findMany();
    const counts = {};
    conditions.forEach((condition) => {
      counts[condition.condition_name] =
        (counts[condition.condition_name] || 0) + 1;
    });
    const topConditions = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    res.json({
      totalAssessments,
      conversionRate: totalAssessments
        ? Math.round((withEmails / totalAssessments) * 100)
        : 0,
      topConditions,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed dashboard stats" });
  }
});

// 6. Public Wellness Submission (No Auth)
router.post("/wellness-submissions", async (req, res) => {
  try {
    const {
      mobile,
      name,
      drinksMilkTea,
      isVegetarian,
      hasWeightLossGoal,
      hasDiabetesOrHypertension,
      wearsSpectacles,
      details,
      source,
      created_by,
      language,
      voiceTranscript,
      userId,
    } = req.body || {};

    if (!mobile || !name || !String(name).trim()) {
      return res
        .status(400)
        .json({ error: "Mobile and name are required for submission" });
    }

    const submission = await prisma.wellnessSubmission.create({
      data: {
        mobile: String(mobile).trim(),
        name: String(name).trim(),
        drinks_milk_tea: toBoolean(drinksMilkTea),
        is_vegetarian: toBoolean(isVegetarian),
        has_weight_loss_goal: toBoolean(hasWeightLossGoal),
        has_diabetes_or_hypertension: toBoolean(hasDiabetesOrHypertension),
        wears_spectacles: toBoolean(wearsSpectacles),
        details: String(details || "").trim(),
        source: String(source || "public-web").trim(),
        created_by: String(created_by || "self").trim(),
        language: language ? String(language).trim() : null,
        voice_transcript: voiceTranscript
          ? String(voiceTranscript).trim().slice(0, 8000)
          : null,
        userId:
          userId === undefined || userId === null || userId === ""
            ? null
            : parseInt(userId, 10),
      },
    });

    res.status(201).json({ success: true, submissionId: submission.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create wellness submission" });
  }
});

// 7. Admin History Grouped by Mobile
router.get("/admin/wellness-history", async (req, res) => {
  try {
    const mobile =
      typeof req.query.mobile === "string" ? req.query.mobile.trim() : "";
    const limitRaw = parseInt(String(req.query.limit || 100), 10);
    const limit = Number.isFinite(limitRaw)
      ? Math.max(1, Math.min(limitRaw, 500))
      : 100;

    const where = mobile ? { mobile } : {};
    const rows = await prisma.wellnessSubmission.findMany({
      where,
      orderBy: [{ mobile: "asc" }, { createdAt: "desc" }],
      take: limit,
    });

    const grouped = rows.reduce((acc, row) => {
      if (!acc[row.mobile]) acc[row.mobile] = [];
      acc[row.mobile].push(row);
      return acc;
    }, {});

    const items = Object.keys(grouped)
      .sort()
      .map((key) => ({
        mobile: key,
        total: grouped[key].length,
        latestAt: grouped[key][0].createdAt,
        submissions: grouped[key],
      }));

    res.json({ totalMobiles: items.length, items });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch wellness history" });
  }
});

// 8. Public History by Mobile
router.get("/wellness-history/:mobile", async (req, res) => {
  try {
    const mobile = String(req.params.mobile || "").trim();
    if (!mobile) {
      return res.status(400).json({ error: "Mobile is required" });
    }

    const submissions = await prisma.wellnessSubmission.findMany({
      where: { mobile },
      orderBy: { createdAt: "desc" },
    });

    res.json({ mobile, total: submissions.length, submissions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

module.exports = router;
