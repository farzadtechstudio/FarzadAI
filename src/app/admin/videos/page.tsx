"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function VideosPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to youtube page
    router.replace("/admin/youtube");
  }, [router]);

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
      <div className="text-[var(--text-secondary)]">Loading...</div>
    </div>
  );
}
