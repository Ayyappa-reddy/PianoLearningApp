"use client";
import { useEffect } from "react";
export function DailyAccessTracker() {
  useEffect(() => { void fetch("/api/login", { method: "POST", credentials: "same-origin" }); }, []);
  return null;
}
