import { NextRequest, NextResponse } from "next/server";
import { USE_SUPABASE, BRAND_CONFIG } from "@/lib/config";
import { getAdminUsers, getBrandConfig } from "@/lib/setup-loader";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "local-dev-secret-change-in-production";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Use local auth if Supabase is not configured
    if (!USE_SUPABASE) {
      const adminUsers = await getAdminUsers();
      const brandConfig = await getBrandConfig();

      const user = adminUsers.find(
        (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
      );

      if (!user) {
        return NextResponse.json(
          { error: "Invalid email or password" },
          { status: 401 }
        );
      }

      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          tenantId: "local",
        },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      const response = NextResponse.json({
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

      response.cookies.set("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });

      return response;
    }

    // Supabase auth
    const { loginUser } = await import("@/lib/auth");
    const result = await loginUser(email, password);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
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

    response.cookies.set("auth_token", result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "An error occurred during login" },
      { status: 500 }
    );
  }
}
