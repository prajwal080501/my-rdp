import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Beam — Remote Access, Fully Under Your Control",
  description:
    "Beam is the self-hosted remote desktop platform built for enterprise: end-to-end WebRTC control, org-wide audit logs, session recording, and zero reliance on a third-party relay.",
  openGraph: {
    title: "Beam — Remote Access, Fully Under Your Control",
    description:
      "Self-hosted remote desktop with enterprise-grade audit logs, session recording, and org-based access control.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
