import { supabase } from "./supabase";
import { User, Tenant } from "@/types";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

export interface AuthResult {
  success: boolean;
  user?: User;
  tenant?: Tenant;
  token?: string;
  error?: string;
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Generate JWT token
export function generateToken(user: User): string {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// Verify JWT token
export function verifyToken(token: string): { userId: string; email: string; role: string; tenantId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string; role: string; tenantId: string };
  } catch {
    return null;
  }
}

// Login user
export async function loginUser(email: string, password: string): Promise<AuthResult> {
  // Get user by email
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("email", email.toLowerCase())
    .eq("is_active", true)
    .single();

  if (userError || !user) {
    return { success: false, error: "Invalid email or password" };
  }

  // Verify password
  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) {
    return { success: false, error: "Invalid email or password" };
  }

  // Get tenant
  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", user.tenant_id)
    .single();

  if (tenantError || !tenant) {
    return { success: false, error: "Tenant not found" };
  }

  // Generate token
  const token = generateToken(user as User);

  return {
    success: true,
    user: user as User,
    tenant: tenant as Tenant,
    token,
  };
}

// Get user from token
export async function getUserFromToken(token: string): Promise<AuthResult> {
  const decoded = verifyToken(token);
  if (!decoded) {
    return { success: false, error: "Invalid token" };
  }

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("id", decoded.userId)
    .eq("is_active", true)
    .single();

  if (userError || !user) {
    return { success: false, error: "User not found" };
  }

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", user.tenant_id)
    .single();

  if (tenantError || !tenant) {
    return { success: false, error: "Tenant not found" };
  }

  return {
    success: true,
    user: user as User,
    tenant: tenant as Tenant,
    token,
  };
}

// Create user (for admin to add staff)
export async function createUser(
  email: string,
  password: string,
  name: string,
  role: "owner" | "admin" | "staff",
  tenantId: string
): Promise<AuthResult> {
  const passwordHash = await hashPassword(password);

  const { data: user, error } = await supabase
    .from("users")
    .insert({
      email: email.toLowerCase(),
      password_hash: passwordHash,
      name,
      role,
      tenant_id: tenantId,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Email already exists" };
    }
    return { success: false, error: error.message };
  }

  return { success: true, user: user as User };
}
