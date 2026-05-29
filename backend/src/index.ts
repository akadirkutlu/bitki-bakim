import bcrypt from "bcryptjs";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { z, type ZodError } from "zod";
import { authMiddleware, type AuthenticatedRequest, signToken } from "./auth";
import { buildCalendarEvents } from "./calendar";
import { readDb, writeDb } from "./db";
import { identifyPlantCandidates } from "./identify";
import { PLANT_TYPES } from "./plantTypes";
import type { Plant } from "./types";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json());

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

  const hasUser = db.users.some((user) => user.email === email);
  if (hasUser) {
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
    createdAt: new Date().toISOString(),
  };

  db.users.push(user);
  await writeDb(db);

  res.status(201).json({
    token: signToken(user.id),
    user: { id: user.id, email: user.email, name: user.name, plan: user.plan },
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

  const isMatch = await bcrypt.compare(password, user.passwordHash);

  if (!isMatch) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }

  res.json({
    token: signToken(user.id),
    user: { id: user.id, email: user.email, name: user.name, plan: user.plan },
  });
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

  if (user.plan === "free" && userPlants.length >= 5) {
    res.status(402).json({
      message: "Free plan limit reached",
      code: "FREE_LIMIT_REACHED",
      maxFreePlants: 5,
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

  const plant: Plant = {
    id: crypto.randomUUID(),
    userId,
    createdAt: new Date().toISOString(),
    ...parseResult.data,
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

app.post("/plants/identify", authMiddleware, (req, res) => {
  const schema = z.object({
    imageHint: z.string().min(1),
  });

  const parseResult = schema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ message: "Invalid payload" });
    return;
  }

  const candidates = identifyPlantCandidates(parseResult.data.imageHint);
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
