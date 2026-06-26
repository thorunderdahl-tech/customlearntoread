import type { Metadata } from "next";
import "./fit.css";

export const metadata: Metadata = {
  title: "FitForge — Custom Workout & Nutrition",
  description:
    "A fully personalized training and nutrition app: custom split, calorie & macro targets, workout logger, and progress tracking. All local to your device.",
};

export default function FitLayout({ children }: { children: React.ReactNode }) {
  return <div className="ff">{children}</div>;
}
