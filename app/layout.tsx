import type { Metadata, Viewport } from "next";
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
  title: "OpthaEdge — Diabetic Eye Screening",
  description:
    "Edge AI diabetic retinopathy screening on Raspberry Pi with patient records, clinician review and patient education. Research use only.",
  applicationName: "OpthaEdge",
  appleWebApp: { capable: true, title: "OpthaEdge", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
