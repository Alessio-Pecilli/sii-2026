import type { Metadata } from "next";
import { IBM_Plex_Mono, Noto_Sans } from "next/font/google";
import "./globals.css";

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fact-Checking AI",
  description: "Single Page Application per la verifica rapida delle notizie.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className={`${notoSans.variable} ${ibmPlexMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
