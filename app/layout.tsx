import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Private Client Prospecting Hub",
  description: "Columbus / Central Ohio prospecting signals: liquidity events, exec changes, M&A, expansions.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
