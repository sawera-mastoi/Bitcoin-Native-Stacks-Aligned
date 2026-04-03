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
  title: "Bitcoin Native Stacks Aligned",
  description: "A secure and decentralized platform built natively on Bitcoin and Stacks.",
  other: {
    "talentapp:project_verification": "f0c6078b73eaa4a2734de9e8653f8eb95af8a54b4e035b6ac4f39a976e13c2d3ef5115410af1c0243702a41ac61fde4d7291ab2ecd4022338b0639d2a47777d4"
  }
};

import { StacksProvider } from "@/components/StacksProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white`}
      >
        <StacksProvider>
          {children}
        </StacksProvider>
      </body>
    </html>
  );
}
