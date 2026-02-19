import { NextResponse } from "next/server";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import path from "path";

export async function GET() {
  const filePath = path.join(process.cwd(), "ref", "assemblage logo.png");

  try {
    await stat(filePath);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  const stream = createReadStream(filePath);
  return new NextResponse(stream as any, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable"
    }
  });
}
