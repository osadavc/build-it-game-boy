import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import "./globals.css";

const sans = Instrument_Sans({
  variable: "--font-sans-ui",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DMG-01 Build Kit",
  description:
    "Assemble an original Game Boy (DMG-01) part by part — every shell, board, button, membrane and screw modelled in 3D.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} h-full antialiased`}>
      <body className="h-full">{children}</body>
    </html>
  );
}
