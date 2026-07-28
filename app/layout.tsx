import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import AppHeader from "@/components/AppHeader";

export const metadata: Metadata = {
  title: "Connect Intelligence Hub",
  description: "Columbus / Central Ohio prospecting signals: liquidity events, exec changes, M&A, expansions.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <AppHeader />
            <div className="flex-1 overflow-y-auto">{children}</div>
          </div>
        </div>
      </body>
    </html>
  );
}
