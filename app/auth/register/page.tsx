'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

export default function RegisterPage() {
  const [formData, setFormData] = useState({ email: '', password: '', fullName: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Create the user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      // 2. Create the profile in your public.users table
      // We generate a username by taking the part of the email before the @
      const generatedUsername = formData.email.split('@')[0] + Math.floor(Math.random() * 1000);

      const { error: dbError } = await supabase
        .from('users')
        .insert([{
          role: 'customer', // Default role for new signups
          username: generatedUsername,
          email: formData.email.trim(),
          passwordhash: formData.password, // Matches your login's plain-text check
          fullname: formData.fullName,
          phone: formData.phone,
          loyalty_points: 0
        }]);

      if (dbError) throw dbError;

      toast.success("Account created! Please sign in.");
      router.push('/auth/login');

    } catch (err: any) {
      console.error("Registration Error:", err.message);
      toast.error(err.message || "An error occurred during registration.");
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-[#f3f4f1] flex items-center justify-center p-6 overflow-hidden">
      <div className="flex flex-col lg:flex-row w-full max-w-5xl bg-white rounded-[40px] shadow-2xl overflow-hidden h-full max-h-[700px]">
        
        {/* Left Side: Branding */}
        <div className="hidden lg:flex lg:w-[42%] bg-[#41644A] p-12 flex-col justify-center relative text-white">
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#41644A] font-black text-xl">g.</div>
               <span className="text-2xl font-black tracking-tighter">groceria.</span>
            </div>
            <h2 className="text-4xl font-black leading-tight">Join the <br /> Community.</h2>
            <p className="text-white/80 text-sm font-medium leading-relaxed">
                Create an account to start tracking your history, earning loyalty points, and unlocking exclusive fresh-market rewards.
            </p>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="w-full lg:w-[58%] p-10 lg:px-16 flex flex-col justify-center overflow-y-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-black text-[#263A29] tracking-tighter">Create Account</h1>
            <p className="text-gray-400 text-sm font-medium mt-1">Start your fresh journey today.</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                <input 
                    type="text" 
                    placeholder="John Doe" 
                    className="w-full p-4 bg-[#f8f9f7] rounded-2xl outline-none border border-transparent focus:border-[#41644A]/30 text-sm font-semibold text-[#263A29]"
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    required
                />
                </div>
                <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                <input 
                    type="tel" 
                    placeholder="+852-XXXX-XXXX" 
                    className="w-full p-4 bg-[#f8f9f7] rounded-2xl outline-none border border-transparent focus:border-[#41644A]/30 text-sm font-semibold text-[#263A29]"
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    required
                />
                </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
              <input 
                type="email" 
                placeholder="email@example.com" 
                className="w-full p-4 bg-[#f8f9f7] rounded-2xl outline-none border border-transparent focus:border-[#41644A]/30 text-sm font-semibold text-[#263A29]"
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Password</label>
              <input 
                type="password" 
                placeholder="Min. 8 characters" 
                className="w-full p-4 bg-[#f8f9f7] rounded-2xl outline-none border border-transparent focus:border-[#41644A]/30 text-sm font-semibold text-[#263A29]"
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-[#41644A] hover:bg-[#263A29] text-white py-5 rounded-[22px] rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl transition-all mt-4 active:scale-[0.98]"
            >
              {loading ? 'Processing...' : 'Register Member'}
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