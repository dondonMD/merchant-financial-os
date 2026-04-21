import "./globals.css";
import type { Metadata } from "next";
import { AppProviders } from "@/components/providers";

export const metadata: Metadata = {
  title: "Vaka",
  description: "Merchant financial operating system prototype for Zimbabwe's informal economy."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

