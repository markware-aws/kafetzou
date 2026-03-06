"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/auth";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    getUser().then((user) => {
      router.replace(user ? "/upload" : "/login");
    });
  }, [router]);

  return null;
}
