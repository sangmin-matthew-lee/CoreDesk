import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generateTicketNumber } from "@/lib/service-calls";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.dept !== "Management" && user.dept !== "Super Admin") {
      return NextResponse.json(
        { error: "Forbidden: Management access only" },
        { status: 403 }
      );
    }

    const { searchParams } = req.nextUrl;
    const dateStr = searchParams.get("date");
    const nextTicketNumber = generateTicketNumber(dateStr);

    return NextResponse.json({ ticket_number: nextTicketNumber });
  } catch (error) {
    console.error("Error in GET /api/service-calls/next-ticket:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
