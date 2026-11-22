"use client";

import { useEffect } from "react";

export function AutoPrint() {
  useEffect(() => {
    const h = setTimeout(() => window.print(), 600);
    return () => clearTimeout(h);
  }, []);
  return null;
}
