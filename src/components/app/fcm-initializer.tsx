"use client";

import { useFcm } from "@/hooks/use-fcm";

export function FcmInitializer() {
  useFcm();
  return null;
}
