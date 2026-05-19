import { NextResponse } from "next/server";

export async function POST() {
  console.log("API appelée !");
  return NextResponse.json({ ok: true });
}
