import type { Metadata } from "next";
import { ScreenOwn } from "@/components/screen-own";

export const metadata: Metadata = { title: "Screen your own round" };

export default function RunPage() {
  return <ScreenOwn />;
}
