import type { Metadata } from "next";
import "./globals.css";
import { DM_Mono } from "next/font/google";
import { cn } from "@/lib/utils";

const dmMono = DM_Mono({ 
  subsets: ["latin"], 
  variable: "--font-mono", 
  weight: ["400", "500"] 
});

export const metadata: Metadata = {
  title: "SBOM.io | Secure Your Software Supply Chain",
  description: "Automate your SBOM compliance and security with high-fidelity reports and real-time vulnerability monitoring.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("dark", dmMono.variable)}>
      <body className="antialiased bg-background text-foreground" style={{ fontFamily: "'Satoshi', sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
