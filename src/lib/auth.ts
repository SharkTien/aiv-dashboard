import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export type SessionUser = {
  sub: number | string;
  role: "admin" | "lead" | "member";
  name: string;
  entity_id: number | string;
};

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get("session")?.value;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    return decoded as SessionUser;
  } catch {
    return null;
  }
}


