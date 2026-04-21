"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAppContext } from "./providers";
import type { Role } from "@/lib/types";

export function AuthGuard({ children, role }: { children: React.ReactNode; role?: Role }) {
  const router = useRouter();
  const { session, translate } = useAppContext();

  useEffect(() => {
    if (!session) {
      router.replace("/");
      return;
    }
    if (role && session.role !== role) {
      router.replace(session.role === "admin" ? "/admin/dashboard" : "/merchant/wallet");
    }
  }, [role, router, session]);

  if (!session) {
    return <div className="p-8 text-sm text-slate-500">{translate("checkingSession")}</div>;
  }

  return <>{children}</>;
}
