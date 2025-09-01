import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set("session", "", { 
    httpOnly: true, 
    path: "/", 
    maxAge: 0,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });
  return res;
}


