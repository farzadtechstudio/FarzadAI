"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "./components/AdminSidebar";
import BrandingSettings from "./components/BrandingSettings";
import TopicCardsSettings from "./components/TopicCardsSettings";
import YouTubeFeed from "./components/YouTubeFeed";
import KnowledgeBase from "./components/KnowledgeBase";
import AISettings from "./components/AISettings";
import TeamSettings from "./components/TeamSettings";

type Tab = "branding" | "topics" | "youtube" | "knowledge" | "ai" | "team";

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

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("branding");
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
    } catch (error) {
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

  const renderContent = () => {
    switch (activeTab) {
      case "branding":
        return <BrandingSettings tenantId={tenant.id} />;
      case "topics":
        return <TopicCardsSettings tenantId={tenant.id} />;
      case "youtube":
        return <YouTubeFeed tenantId={tenant.id} />;
      case "knowledge":
        return <KnowledgeBase tenantId={tenant.id} />;
      case "ai":
        return <AISettings tenantId={tenant.id} />;
      case "team":
        return <TeamSettings tenantId={tenant.id} userRole={user.role} />;
      default:
        return <BrandingSettings tenantId={tenant.id} />;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <AdminSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        user={user}
        tenant={tenant}
        onLogout={handleLogout}
      />

      <main className="lg:pl-64">
        <div className="p-6 lg:p-8">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
