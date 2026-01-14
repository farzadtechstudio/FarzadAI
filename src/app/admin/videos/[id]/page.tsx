"use client";

import { useEffect, use } from "react";
import { useRouter } from "next/navigation";

export default function VideoDetailRedirect({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  useEffect(() => {
    // Redirect to youtube video detail page
    router.replace(`/admin/youtube/${id}`);
  }, [router, id]);

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
      <div className="text-[var(--text-secondary)]">Loading...</div>
    </div>
  );
}
