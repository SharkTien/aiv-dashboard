import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.redirect("/auth/login");
  res.cookies.set("session", "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}


