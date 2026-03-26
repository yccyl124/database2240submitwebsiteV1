// app/layout.tsx
import "@/app/globals.css"; 
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "FreshMarket Red | Inventory Management",
  description: "Single Source of Truth for Supermarket Operations",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* 
        CRITICAL: We add suppressHydrationWarning to <body> as well 
        because extensions like Grammarly inject attributes directly here.
      */}
      <body className={inter.className} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}