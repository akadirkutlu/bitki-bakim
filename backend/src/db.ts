import { promises as fs } from "fs";
import path from "path";
import type { DatabaseShape, Plant, User } from "./types";
import { normalizeUser } from "./userAuth";

const DATA_DIR = path.join(__dirname, "..", "data");
const USERS_FILE_PATH = path.join(DATA_DIR, "users.json");
const PLANTS_FILE_PATH = path.join(DATA_DIR, "plants.json");
const LEGACY_DB_FILE_PATH = path.join(DATA_DIR, "db.json");

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readJsonArray<T>(filePath: string, fallback: T[]): Promise<T[]> {
  try {
    await fs.access(filePath);
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T[];
  } catch {
    return fallback;
  }
}

async function migrateLegacyDb(): Promise<void> {
  try {
    await fs.access(LEGACY_DB_FILE_PATH);
  } catch {
    return;
  }

  const raw = await fs.readFile(LEGACY_DB_FILE_PATH, "utf-8");
  const parsed = JSON.parse(raw) as DatabaseShape;

  await fs.writeFile(USERS_FILE_PATH, JSON.stringify(parsed.users ?? [], null, 2), "utf-8");
  await fs.writeFile(PLANTS_FILE_PATH, JSON.stringify(parsed.plants ?? [], null, 2), "utf-8");
  await fs.unlink(LEGACY_DB_FILE_PATH);
}

async function ensureDbFiles(): Promise<void> {
  await ensureDataDir();
  await migrateLegacyDb();

  const [usersExist, plantsExist] = await Promise.all([
    fs.access(USERS_FILE_PATH).then(() => true).catch(() => false),
    fs.access(PLANTS_FILE_PATH).then(() => true).catch(() => false),
  ]);

  if (!usersExist) {
    await fs.writeFile(USERS_FILE_PATH, JSON.stringify([], null, 2), "utf-8");
  }
  if (!plantsExist) {
    await fs.writeFile(PLANTS_FILE_PATH, JSON.stringify([], null, 2), "utf-8");
  }
}

export async function readDb(): Promise<DatabaseShape> {
  await ensureDbFiles();

  const [users, plants] = await Promise.all([
    readJsonArray<User>(USERS_FILE_PATH, []),
    readJsonArray<Plant>(PLANTS_FILE_PATH, []),
  ]);

  return {
    users: users.map((user) => normalizeUser(user)),
    plants,
  };
}

export async function writeDb(data: DatabaseShape): Promise<void> {
  await ensureDataDir();
  await Promise.all([
    fs.writeFile(USERS_FILE_PATH, JSON.stringify(data.users, null, 2), "utf-8"),
    fs.writeFile(PLANTS_FILE_PATH, JSON.stringify(data.plants, null, 2), "utf-8"),
  ]);
}
