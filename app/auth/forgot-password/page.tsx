'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Check if email exists in your new schema 'email' column
      const { data: user } = await supabase
        .from('users')
        .select('email')
        .eq('email', email.trim())
        .maybeSingle();

      if (!user) {
        throw new Error("This email is not registered in our database.");
      }

      // 2. Request link from Supabase
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;

      toast.success('Check your inbox for the recovery link!');
      router.push('/auth/login');
    } catch (err: any) {
      toast.error(err.message || "Failed to send link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f4f1] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl p-10 lg:p-12">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#41644A]/10 rounded-2xl text-[#41644A] text-3xl mb-4">🔑</div>
          <h1 className="text-2xl font-black text-[#263A29]">Forgot Password?</h1>
          <p className="text-gray-400 font-medium mt-2 text-sm leading-relaxed">
            Enter your email to receive a secure password recovery link.
          </p>
        </div>

        <form onSubmit={handleResetRequest} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
            <input 
              type="email" 
              placeholder="email@example.com" 
              className="w-full p-4 bg-[#f8f9f7] rounded-2xl outline-none border border-transparent focus:border-[#41644A]/30 transition-all text-[#263A29] font-semibold"
              value={email || ''} 
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#41644A] hover:bg-[#263A29] text-white py-4 rounded-2xl font-bold shadow-lg transition-transform active:scale-[0.98]"
          >
            {loading ? 'Verifying...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <Link href="/auth/login" className="text-xs font-black uppercase tracking-widest text-[#41644A] hover:underline">
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}