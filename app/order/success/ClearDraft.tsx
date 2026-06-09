"use client";

import { useEffect } from "react";

// After a successful payment, clear the saved order draft so a future visit
// to /order starts fresh. Key must match DRAFT_KEY in OrderForm.tsx.
export default function ClearDraft() {
  useEffect(() => {
    try {
      sessionStorage.removeItem("clr_order_draft_v1");
    } catch {
      // Storage unavailable — nothing to clear.
    }
  }, []);
  return null;
}
