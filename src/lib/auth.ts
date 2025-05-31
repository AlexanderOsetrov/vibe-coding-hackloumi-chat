import * as argon2 from "argon2";
import * as jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const JWT_SECRET =
  process.env.JWT_SECRET || "fallback-secret-key-change-in-production";

export async function hashPassword(password: string): Promise<string> {
  return await argon2.hash(password);
}

export async function verifyPassword(
  hashedPassword: string,
  password: string
): Promise<boolean> {
  try {
    return await argon2.verify(hashedPassword, password);
  } catch {
    return false;
  }
}

export async function createJWT(payload: {
  userId: string;
  username: string;
}): Promise<string> {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "24h",
  });
}

export async function verifyJWT(
  token: string
): Promise<{ userId: string; username: string } | null> {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      username: string;
    };
    return payload;
  } catch {
    return null;
  }
}

export async function getAuthUser(): Promise<{
  userId: string;
  username: string;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;

  if (!token) return null;

  return await verifyJWT(token);
}

export async function verifyAuth(request: NextRequest): Promise<{
  success: boolean;
  userId?: string;
  username?: string;
}> {
  try {
    const cookieHeader = request.headers.get("cookie");
    if (!cookieHeader) {
      return { success: false };
    }

    // Parse the auth-token from cookies
    const authTokenMatch = cookieHeader.match(/auth-token=([^;]+)/);
    if (!authTokenMatch) {
      return { success: false };
    }

    const token = authTokenMatch[1];
    const payload = await verifyJWT(token);

    if (!payload) {
      return { success: false };
    }

    return {
      success: true,
      userId: payload.userId,
      username: payload.username,
    };
  } catch {
    return { success: false };
  }
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set("auth-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && !process.env.DOCKER_ENV,
    sameSite: "lax",
    maxAge: 60 * 60 * 24, // 24 hours
    path: "/",
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete("auth-token");
}
