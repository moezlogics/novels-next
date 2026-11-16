"use client";
import { useEffect, useState } from "react";

export interface Me {
  member: { id: number; name: string; username: string; email: string; phone: string; bio: string; profile_pic: string } | null;
  admin: { username: string } | null;
}

let cache: Promise<Me> | null = null;

export function fetchMe(force = false): Promise<Me> {
  if (!cache || force) {
    cache = fetch("/api/me/", { credentials: "same-origin", cache: "no-store" })
      .then((r) => r.json())
      .catch(() => ({ member: null, admin: null }));
  }
  return cache;
}

/** Signed-in state for statically cached pages (fetched after paint). */
export function useMe(): Me | null {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    let alive = true;
    fetchMe().then((m) => alive && setMe(m));
    return () => {
      alive = false;
    };
  }, []);
  return me;
}
