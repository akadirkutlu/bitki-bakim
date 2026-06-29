import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";

export function signToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "30d" });
}

export type AuthenticatedRequest = Request & {
  userId: string;
};

/**
 * Best-effort extraction of the user id from the Authorization header.
 * Returns null instead of throwing so it can be used on endpoints that are
 * usable both anonymously and while a (guest) session token is present.
 */
export function getOptionalUserId(req: Request): string | null {
  const token = req.header("authorization")?.replace("Bearer ", "");

  if (!token) {
    return null;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    return payload.userId;
  } catch {
    return null;
  }
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const token = req.header("authorization")?.replace("Bearer ", "");

  if (!token) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    (req as AuthenticatedRequest).userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}
