"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Re-fetches the page while it's visible, so new holds appear without a reload. */
export function LiveRefresh({ everyMs = 8000 }: { everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, everyMs);
    return () => clearInterval(id);
  }, [router, everyMs]);
  return null;
}
