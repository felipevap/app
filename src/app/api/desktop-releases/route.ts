import { NextResponse } from "next/server";
import { parseDesktopReleasesFromEnv } from "@/lib/desktop-releases";

export async function GET() {
    return NextResponse.json(parseDesktopReleasesFromEnv());
}
