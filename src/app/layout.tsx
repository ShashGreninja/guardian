import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Bricolage_Grotesque, Martian_Mono } from "next/font/google";
import "./globals.css";

// Atkinson Hyperlegible was designed by the Braille Institute for low-vision
// readers, which is exactly who the parent view is for.
const atkinson = Atkinson_Hyperlegible({
  variable: "--font-atkinson",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["wdth", "opsz"],
});

const martian = Martian_Mono({
  variable: "--font-martian",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Guardian",
  description:
    "A PayPal shopping agent for aging parents. Every payment is held, checked, and only then released.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // The landing intro marks returning visitors on <html> before hydration.
      suppressHydrationWarning
      className={`${atkinson.variable} ${bricolage.variable} ${martian.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
