import type { Metadata } from "next";
import InterviewClient from "./InterviewClient";

export const metadata: Metadata = {
  title: "WSP Panel Simulator",
  robots: { index: false, follow: false },
};

export default function InterviewPage() {
  return <InterviewClient />;
}
