'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface NavbarProps {
  user: any;
  onProfileClick: () => void;
}

export default function Navbar({ user, onProfileClick }: NavbarProps) {
  const router = useRouter();

  return (
    <nav className="flex justify-between items-center px-10 py-6 bg-white sticky top-0 z-40">
      <div 
        className="flex items-center gap-2 text-2xl font-black text-[#263A29] cursor-pointer" 
        onClick={() => router.push('/')}
      >
        <div className="w-10 h-10 bg-[#41644A] rounded-xl flex items-center justify-center text-white shadow-lg">g.</div>
        groceria.
      </div>

      <div className="flex gap-4 items-center">
        {user ? (
          <button 
            onClick={onProfileClick} 
            className="flex items-center gap-3 bg-white border-2 border-gray-100 pl-2 pr-5 py-2 rounded-full hover:border-[#41644A] transition-all shadow-sm"
          >
            <div className="w-10 h-10 bg-[#41644A] rounded-full flex items-center justify-center text-white font-bold">
              {user.email?.[0].toUpperCase()}
            </div>
            <div className="text-left leading-tight">
              <p className="text-[10px] font-black text-gray-400 uppercase">Member</p>
              <p className="text-sm font-bold text-[#263A29]">Account</p>
            </div>
          </button>
        ) : (
          <>
            <Link href="/auth/login" className="text-gray-400 font-bold px-4">Sign In</Link>
            <Link href="/auth/register" className="bg-[#41644A] text-white px-8 py-3 rounded-full font-bold shadow-lg">Join Now</Link>
          </>
        )}
      </div>
    </nav>
  );
}