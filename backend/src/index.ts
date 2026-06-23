import bcrypt from "bcryptjs";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { z, type ZodError } from "zod";
import { authMiddleware, type AuthenticatedRequest, signToken } from "./auth";
import {
  isAppleConfigured,
  shouldDowngradeFromNotification,
  shouldUpgradeFromNotification,
  verifyAppleNotification,
  verifyAppleSignedTransaction,
} from "./appleSubscriptions";
import { buildCalendarEvents } from "./calendar";
import { readDb, writeDb } from "./db";
import { identifyPlantCandidates } from "./identify";
import { getPlantLimit, isPlantLimitReached } from "./plans";
import { PLANT_TYPES } from "./plantTypes";
import { identifyPlantHintFromImage, isPlantVisionConfigured } from "./plantVision";
import { verifyAppleIdentityToken, verifyGoogleIdToken } from "./socialAuth";
import {
  applySubscriptionToUser,
  downgradeUserSubscription,
  findConflictingSubscriptionOwner,
  findUserByOriginalTransactionId,
} from "./subscriptionService";
import type { Plant } from "./types";
import { socialProviderLabel, toPublicUser, upsertSocialUser } from "./userAuth";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

function validationErrorResponse(res: express.Response, error: ZodError): void {
  const issue = error.issues[0];
  const field = issue?.path?.[0];
  res.status(400).json({
    message: issue?.message ?? "Invalid payload",
    field: typeof field === "string" ? field : undefined,
  });
}

const registerSchema = z.object({
  email: z.string().trim().pipe(z.email()),
  password: z.string().min(6),
  name: z.string().trim().min(2),
});

app.post("/auth/register", async (req, res) => {
  const parseResult = registerSchema.safeParse(req.body);

  if (!parseResult.success) {
    validationErrorResponse(res, parseResult.error);
    return;
  }

  const { email, password, name } = parseResult.data;
  const db = await readDb();

  const existingUser = db.users.find(
    (item) => item.email.trim().toLowerCase() === email.trim().toLowerCase()
  );

  if (existingUser) {
    if (existingUser.authProvider !== "email") {
      res.status(409).json({
        message: `Account already exists. Sign in with ${socialProviderLabel(existingUser.authProvider)}.`,
        code: "USE_SOCIAL_LOGIN",
        provider: existingUser.authProvider,
      });
      return;
    }

    res.status(409).json({ message: "User already exists" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: crypto.randomUUID(),
    email,
    passwordHash,
    name,
    plan: "free" as const,
    authProvider: "email" as const,
    createdAt: new Date().toISOString(),
  };

  db.users.push(user);
  await writeDb(db);

  res.status(201).json({
    token: signToken(user.id),
    user: toPublicUser(user),
  });
});

const loginSchema = z.object({
  email: z.string().trim().pipe(z.email()),
  password: z.string().min(6),
});

app.post("/auth/login", async (req, res) => {
  const parseResult = loginSchema.safeParse(req.body);

  if (!parseResult.success) {
    validationErrorResponse(res, parseResult.error);
    return;
  }

  const { email, password } = parseResult.data;
  const db = await readDb();
  const user = db.users.find((item) => item.email === email);

  if (!user) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }

  if (!user.passwordHash) {
    res.status(401).json({
      message: `This account uses ${socialProviderLabel(user.authProvider)} sign-in.`,
      code: "USE_SOCIAL_LOGIN",
      provider: user.authProvider,
    });
    return;
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);

  if (!isMatch) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }

  res.json({
    token: signToken(user.id),
    user: toPublicUser(user),
  });
});

const googleAuthSchema = z.object({
  idToken: z.string().min(1),
});

app.post("/auth/google", async (req, res) => {
  const parseResult = googleAuthSchema.safeParse(req.body);

  if (!parseResult.success) {
    validationErrorResponse(res, parseResult.error);
    return;
  }

  try {
    const profile = await verifyGoogleIdToken(parseResult.data.idToken);
    const db = await readDb();
    const user = upsertSocialUser(db.users, {
      provider: "google",
      providerId: profile.googleId,
      email: profile.email,
      name: profile.name,
    });

    await writeDb(db);

    res.json({
      token: signToken(user.id),
      user: toPublicUser(user),
    });
  } catch (error) {
    res.status(401).json({
      message: error instanceof Error ? error.message : "Google sign-in failed",
    });
  }
});

const appleAuthSchema = z.object({
  identityToken: z.string().min(1),
  fullName: z
    .object({
      givenName: z.string().optional(),
      familyName: z.string().optional(),
    })
    .optional(),
});

app.post("/auth/apple", async (req, res) => {
  const parseResult = appleAuthSchema.safeParse(req.body);

  if (!parseResult.success) {
    validationErrorResponse(res, parseResult.error);
    return;
  }

  try {
    const profile = await verifyAppleIdentityToken(parseResult.data.identityToken);
    const fullName = parseResult.data.fullName;
    const composedName = [fullName?.givenName, fullName?.familyName]
      .filter(Boolean)
      .join(" ")
      .trim();

    const db = await readDb();
    const user = upsertSocialUser(db.users, {
      provider: "apple",
      providerId: profile.appleId,
      email: profile.email,
      name: composedName || profile.name,
    });

    await writeDb(db);

    res.json({
      token: signToken(user.id),
      user: toPublicUser(user),
    });
  } catch (error) {
    res.status(401).json({
      message: error instanceof Error ? error.message : "Apple sign-in failed",
    });
  }
});

app.get("/auth/me", authMiddleware, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const db = await readDb();
  const user = db.users.find((item) => item.id === userId);

  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  res.json({ user: toPublicUser(user) });
});

const verifyAppleSubscriptionSchema = z.object({
  signedTransaction: z.string().min(1),
});

app.post("/subscription/apple/verify", authMiddleware, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const parseResult = verifyAppleSubscriptionSchema.safeParse(req.body);

  if (!parseResult.success) {
    validationErrorResponse(res, parseResult.error);
    return;
  }

  if (!isAppleConfigured()) {
    res.status(503).json({ message: "Apple subscription verification is not configured" });
    return;
  }

  try {
    const subscription = await verifyAppleSignedTransaction(parseResult.data.signedTransaction);
    const db = await readDb();
    const user = db.users.find((item) => item.id === userId);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (!subscription.originalTransactionId) {
      res.status(400).json({ message: "Invalid Apple transaction" });
      return;
    }

    const conflictingOwner = findConflictingSubscriptionOwner(
      db.users,
      subscription.originalTransactionId,
      userId
    );

    if (conflictingOwner) {
      res.status(409).json({
        message: "This subscription is already linked to another account",
        code: "SUBSCRIPTION_ALREADY_LINKED",
      });
      return;
    }

    applySubscriptionToUser(user, subscription);
    await writeDb(db);

    res.json({ user: toPublicUser(user) });
  } catch (error) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "Could not verify Apple subscription",
    });
  }
});

const appleWebhookSchema = z.object({
  signedPayload: z.string().min(1),
});

app.post("/webhooks/apple/subscriptions", async (req, res) => {
  const parseResult = appleWebhookSchema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({ message: "Invalid payload" });
    return;
  }

  if (!isAppleConfigured()) {
    res.status(503).json({ message: "Apple subscription verification is not configured" });
    return;
  }

  try {
    const notification = await verifyAppleNotification(parseResult.data.signedPayload);
    const signedTransactionInfo = notification.data?.signedTransactionInfo;

    if (!signedTransactionInfo) {
      res.status(200).json({ ok: true });
      return;
    }

    const subscription = await verifyAppleSignedTransaction(signedTransactionInfo);
    const db = await readDb();
    const user = findUserByOriginalTransactionId(db.users, subscription.originalTransactionId);

    if (!user) {
      res.status(200).json({ ok: true });
      return;
    }

    if (shouldDowngradeFromNotification(notification)) {
      downgradeUserSubscription(user);
    } else if (shouldUpgradeFromNotification(notification)) {
      applySubscriptionToUser(user, subscription);
    } else if (!subscription.isActive) {
      downgradeUserSubscription(user);
    } else {
      applySubscriptionToUser(user, subscription);
    }

    await writeDb(db);
    res.status(200).json({ ok: true });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Apple subscription webhook failed:", error);
    res.status(400).json({
      message: error instanceof Error ? error.message : "Could not process Apple notification",
    });
  }
});

app.get("/plant-types", authMiddleware, (_req, res) => {
  res.json({ plantTypes: PLANT_TYPES });
});

app.get("/plants", authMiddleware, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const db = await readDb();
  const plants = db.plants.filter((plant) => plant.userId === userId);
  res.json({ plants });
});

const createPlantSchema = z.object({
  nickname: z.string().min(1),
  plantTypeId: z.string().min(1),
  lastWateringDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  lastFeedingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  lastSoilChangeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  imageHint: z.string().optional(),
  photoUri: z.string().optional(),
});

app.post("/plants", authMiddleware, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const parseResult = createPlantSchema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({ message: "Invalid payload" });
    return;
  }

  const db = await readDb();
  const user = db.users.find((item) => item.id === userId);
  const userPlants = db.plants.filter((plant) => plant.userId === userId);

  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  if (isPlantLimitReached(user.plan, userPlants.length)) {
    const maxPlants = getPlantLimit(user.plan);
    res.status(402).json({
      message: "Plan limit reached",
      code: "PLAN_LIMIT_REACHED",
      plan: user.plan,
      maxPlants,
    });
    return;
  }

  const plantTypeExists = PLANT_TYPES.some(
    (plantType) => plantType.id === parseResult.data.plantTypeId
  );

  if (!plantTypeExists) {
    res.status(400).json({ message: "Unknown plant type" });
    return;
  }

  const nickname = parseResult.data.nickname.trim();
  const nicknameTaken = userPlants.some(
    (item) => item.nickname.trim().toLocaleLowerCase("tr") === nickname.toLocaleLowerCase("tr")
  );

  if (nicknameTaken) {
    res.status(409).json({ message: "Plant nickname already exists" });
    return;
  }

  const plant: Plant = {
    id: crypto.randomUUID(),
    userId,
    createdAt: new Date().toISOString(),
    ...parseResult.data,
    nickname,
  };

  db.plants.push(plant);
  await writeDb(db);

  res.status(201).json({ plant });
});

const updatePlantSchema = z.object({
  nickname: z.string().min(1).optional(),
  lastWateringDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  lastFeedingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  lastSoilChangeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

app.patch("/plants/:id", authMiddleware, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const parseResult = updatePlantSchema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({ message: "Invalid payload" });
    return;
  }

  const db = await readDb();
  const plant = db.plants.find(
    (item) => item.id === req.params.id && item.userId === userId
  );

  if (!plant) {
    res.status(404).json({ message: "Plant not found" });
    return;
  }

  Object.assign(plant, parseResult.data);
  await writeDb(db);

  res.json({ plant });
});

app.delete("/plants/:id", authMiddleware, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const db = await readDb();
  const plantIndex = db.plants.findIndex(
    (item) => item.id === req.params.id && item.userId === userId
  );

  if (plantIndex === -1) {
    res.status(404).json({ message: "Plant not found" });
    return;
  }

  db.plants.splice(plantIndex, 1);
  await writeDb(db);

  res.status(204).send();
});

app.post("/plants/identify", authMiddleware, async (req, res) => {
  const schema = z
    .object({
      imageBase64: z.string().min(1).optional(),
      imageHint: z.string().min(1).optional(),
    })
    .refine((data) => Boolean(data.imageBase64 || data.imageHint), {
      message: "imageBase64 or imageHint is required",
    });

  const parseResult = schema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ message: "Invalid payload" });
    return;
  }

  let hint = parseResult.data.imageHint ?? "";

  if (parseResult.data.imageBase64) {
    if (!isPlantVisionConfigured()) {
      res.status(503).json({
        message: "Photo identification is not configured on the server",
      });
      return;
    }

    try {
      hint = await identifyPlantHintFromImage(parseResult.data.imageBase64);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Plant vision identification failed:", error);
      res.status(502).json({ message: "Could not identify plant from photo" });
      return;
    }
  }

  const candidates = identifyPlantCandidates(hint);
  res.json({ candidates });
});

app.get("/calendar", authMiddleware, async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const plantId = typeof req.query.plantId === "string" ? req.query.plantId : "";
  const db = await readDb();

  const scopedPlants = db.plants.filter(
    (plant) => plant.userId === userId && (!plantId || plant.id === plantId)
  );

  const events = buildCalendarEvents(scopedPlants);
  res.json({ events });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${PORT}`);
});
