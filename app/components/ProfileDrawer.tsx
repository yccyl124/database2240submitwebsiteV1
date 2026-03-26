'use client';

import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface ProfileDrawerProps {
  user: any;
  profile: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileDrawer({ user, profile, isOpen, onClose }: ProfileDrawerProps) {
  if (!isOpen) return null;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      
      {/* Drawer Content */}
      <div className="relative w-96 bg-white h-full shadow-2xl p-10 flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black text-[#263A29]">Member Profile</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl">✕</button>
        </div>

        <div className="bg-[#f3f4f1] p-6 rounded-[30px] mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-[#41644A] rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
              {user?.email?.[0].toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-[#263A29] truncate w-48">{user?.email}</p>
              <p className="text-[10px] font-black text-[#41644A] uppercase mt-1">Gold Member</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 border-t border-gray-200 pt-4">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase">Loyalty Points</p>
              <p className="text-xl font-black text-[#41644A]">{profile?.loyalty_points || '1,250'}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase">Member Since</p>
              <p className="font-bold text-[#263A29]">Feb 2026</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Link href="/customer" className="block w-full py-4 bg-[#41644A] text-white text-center rounded-2xl font-bold shadow-lg">
            Open My Portal
          </Link>
          <button className="w-full py-4 border-2 border-gray-100 rounded-2xl font-bold text-gray-400 hover:text-[#263A29]">
            Change Password
          </button>
          <button onClick={handleSignOut} className="w-full py-4 text-red-500 font-bold mt-4">
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}