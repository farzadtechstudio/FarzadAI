"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "../components/AdminSidebar";
import YouTubeFeed from "../components/YouTubeFeed";

interface UserData {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface TenantData {
  id: string;
  slug: string;
  brand_name: string;
}

export default function YouTubePage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (!response.ok) {
        router.push("/admin/login");
        return;
      }
      const data = await response.json();
      setUser(data.user);
      setTenant(data.tenant);
    } catch {
      router.push("/admin/login");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-[var(--text-secondary)]">Loading...</div>
      </div>
    );
  }

  if (!user || !tenant) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <AdminSidebar
        activeTab="youtube"
        onTabChange={(tab) => router.push(`/admin/${tab}`)}
        user={user}
        tenant={tenant}
        onLogout={handleLogout}
      />

      <main className="lg:pl-64">
        <div className="p-6 lg:p-8">
          <YouTubeFeed tenantId={tenant.id} />
        </div>
      </main>
    </div>
  );
}
