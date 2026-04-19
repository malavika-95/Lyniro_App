import bcrypt from "bcrypt";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const password = "demo1234";
    const hash = await bcrypt.hash(password, 10);
    
    // Also test if we can compare it
    const matches = await bcrypt.compare(password, hash);
    
    return NextResponse.json({
      password,
      hash,
      testCompare: matches
    });
  } catch (error) {
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}
