"use client";

import Sidebar from "./Sidebar";
import { usePathname } from "next/navigation";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Exclude Guest Main Page and Auth Pages from Sidebar
  const isPublicPage = pathname === "/" || pathname.startsWith("/auth");

  return (
    <div className="flex min-h-screen w-full bg-[#f3f4f1]"> 
      {!isPublicPage && <Sidebar />}
      
      <main className={`flex-1 ${!isPublicPage ? 'p-8 overflow-y-auto' : ''}`}>
        {children}
      </main>
    </div>
  );
}