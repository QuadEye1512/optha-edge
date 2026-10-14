import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AppShell from "@/components/AppShell";
import { getViewerDTO } from "@/lib/auth/authorization";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OpthaEdge — Retinal Screening Decision Support",
  description:
    "Research-stage AI-assisted diabetic retinopathy screening and severity model review. Screening results require professional review and are not diagnoses.",
  keywords: [
    "diabetic retinopathy",
    "retinal screening",
    "eye screening decision support",
    "medical AI research",
    "fundus image analysis",
    "OpthaEdge",
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const viewer = await getViewerDTO();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AppShell viewer={viewer}>{children}</AppShell>
      </body>
    </html>
  );
}
