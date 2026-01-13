import { NextRequest, NextResponse } from "next/server";
import { USE_SUPABASE } from "@/lib/config";
import { getAdminUsers, getBrandConfig } from "@/lib/setup-loader";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "local-dev-secret-change-in-production";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Use local auth if Supabase is not configured
    if (!USE_SUPABASE) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as {
          userId: string;
          email: string;
          role: string;
          tenantId: string;
        };

        const adminUsers = await getAdminUsers();
        const brandConfig = await getBrandConfig();

        const user = adminUsers.find((u) => u.id === decoded.userId);

        if (!user) {
          return NextResponse.json(
            { error: "User not found" },
            { status: 401 }
          );
        }

        return NextResponse.json({
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
          tenant: {
            id: "local",
            slug: "local",
            brand_name: brandConfig.brand_name,
          },
        });
      } catch {
        return NextResponse.json(
          { error: "Invalid token" },
          { status: 401 }
        );
      }
    }

    // Supabase auth
    const { getUserFromToken } = await import("@/lib/auth");
    const result = await getUserFromToken(token);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: {
        id: result.user!.id,
        email: result.user!.email,
        name: result.user!.name,
        role: result.user!.role,
      },
      tenant: {
        id: result.tenant!.id,
        slug: result.tenant!.slug,
        brand_name: result.tenant!.brand_name,
      },
    });
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
