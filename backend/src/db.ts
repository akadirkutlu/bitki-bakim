import { promises as fs } from "fs";
import path from "path";
import type { DatabaseShape } from "./types";

const DB_FILE_PATH = path.join(__dirname, "..", "data", "db.json");

const EMPTY_DB: DatabaseShape = {
  users: [],
  plants: [],
};

async function ensureDbFile(): Promise<void> {
  try {
    await fs.access(DB_FILE_PATH);
  } catch {
    await fs.mkdir(path.dirname(DB_FILE_PATH), { recursive: true });
    await fs.writeFile(DB_FILE_PATH, JSON.stringify(EMPTY_DB, null, 2), "utf-8");
  }
}

export async function readDb(): Promise<DatabaseShape> {
  await ensureDbFile();
  const raw = await fs.readFile(DB_FILE_PATH, "utf-8");
  return JSON.parse(raw) as DatabaseShape;
}

export async function writeDb(data: DatabaseShape): Promise<void> {
  await fs.writeFile(DB_FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
}
