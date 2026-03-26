'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

export default function RegisterPage() {
  const [formData, setFormData] = useState({ email: '', password: '', fullName: '' });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Using simple logic for demo - you'd normally use supabase.auth.signUp
    toast.success("Account request submitted for approval!");
    router.push('/auth/login');
  };

  return (
    <div className="h-screen w-screen bg-[#f3f4f1] flex items-center justify-center p-6 overflow-hidden">
      <div className="flex flex-col lg:flex-row w-full max-w-5xl bg-white rounded-[40px] shadow-2xl overflow-hidden h-full max-h-[700px]">
        
        {/* Left Side (Same Branding) */}
        <div className="hidden lg:flex lg:w-[42%] bg-[#41644A] p-12 flex-col justify-center relative text-white">
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#41644A] font-black text-xl">g.</div>
               <span className="text-2xl font-black tracking-tighter">groceria.</span>
            </div>
            <h2 className="text-4xl font-black leading-tight">Join the <br /> Community.</h2>
            <p className="text-white/80 text-sm font-medium">Create an account to start tracking your history and unlock exclusive fresh-market rewards.</p>
          </div>
        </div>

        {/* Right Side: Registration Form */}
        <div className="w-full lg:w-[58%] p-10 lg:px-16 flex flex-col justify-center overflow-y-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-black text-[#263A29]">Create Account</h1>
            <p className="text-gray-400 text-sm font-medium mt-1">Start your fresh journey today.</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
              <input 
                type="text" 
                placeholder="John Doe" 
                className="w-full p-4 bg-[#f8f9f7] rounded-2xl outline-none border border-transparent focus:border-[#41644A]/30 text-sm font-semibold"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
              <input 
                type="email" 
                placeholder="email@example.com" 
                className="w-full p-4 bg-[#f8f9f7] rounded-2xl outline-none border border-transparent focus:border-[#41644A]/30 text-sm font-semibold"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Password</label>
              <input 
                type="password" 
                placeholder="Min. 8 characters" 
                className="w-full p-4 bg-[#f8f9f7] rounded-2xl outline-none border border-transparent focus:border-[#41644A]/30 text-sm font-semibold"
                required
              />
            </div>

            <button type="submit" disabled={loading} className="w-full bg-[#41644A] hover:bg-[#263A29] text-white py-4 rounded-2xl font-bold shadow-lg transition-all mt-4">
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-xs font-bold text-gray-300 mt-8">
            Already have an account? <Link href="/auth/login" className="text-[#41644A] font-black hover:underline ml-1">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}