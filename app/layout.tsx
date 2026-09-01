import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/app/globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Clipped AI | The Autonomous Video Generation Studio",
    template: "%s | Clipped AI"
  },
  description: "Transform ideas into viral videos instantly. Clipped AI automates scriptwriting, voiceovers, character consistency, and video generation in one seamless dashboard.",
  keywords: ["AI Video Generator", "Text to Video", "OpenAI", "Kling AI", "Luma", "Content Creation"],
  authors: [{ name: "Clipped AI Team" }],
  creator: "Clipped AI",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://clipped.ai",
    title: "Clipped AI | The Autonomous Video Generation Studio",
    description: "Transform ideas into viral videos instantly. Clipped AI automates scriptwriting, voiceovers, character consistency, and video generation in one seamless dashboard.",
    siteName: "Clipped AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "Clipped AI | The Autonomous Video Generation Studio",
    description: "Transform ideas into viral videos instantly.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
