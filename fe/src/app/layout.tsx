import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AmplifyProvider } from "@/components/amplify-provider";
import { Footer } from "@/components/footer";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Kafetzou — AI Coffee Cup Readings",
  description: "Discover your fortune through the ancient art of Greek coffee cup reading, powered by AI.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.variable} antialiased`}>
        <AmplifyProvider>
          {children}
          <Footer />
        </AmplifyProvider>
      </body>
    </html>
  );
}
