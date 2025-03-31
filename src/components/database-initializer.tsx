"use client";

import { useEffect } from "react";
import { initializeDatabase } from "@/lib/supabase";

export function DatabaseInitializer() {
  useEffect(() => {
    // Only run in development environment
    if (process.env.NODE_ENV === 'development') {
      initializeDatabase().catch(console.error);
    }
  }, []);

  // This component doesn't render anything
  return null;
} 