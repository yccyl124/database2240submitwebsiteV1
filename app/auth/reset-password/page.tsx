'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Update the password in Supabase Auth (Secure Layer)
      const { data, error: authError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (authError) throw authError;

      // 2. LINK TO DB: Update the passwordhash in your public.users table
      // This is necessary because your login/page.tsx checks this column manually
      if (data.user?.email) {
        const { error: dbError } = await supabase
          .from('users')
          .update({ passwordhash: newPassword }) // Links to your passwordhash column
          .eq('email', data.user.email);

        if (dbError) throw dbError;
      }

      toast.success('Security updated! Please sign in with your new password.');
      router.push('/auth/login');
    } catch (err: any) {
      toast.error(err.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f4f1] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl p-10 animate-in fade-in zoom-in duration-300">
        <h1 className="text-3xl font-black text-[#263A29] tracking-tighter mb-2">Create New Password</h1>
        <p className="text-gray-400 text-sm mb-8">Ensure your new password is secure and at least 8 characters long.</p>
        
        <form onSubmit={handleUpdatePassword} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">New Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              className="w-full p-4 bg-[#f8f9f7] rounded-2xl outline-none border-2 border-transparent focus:border-[#41644A]/20 transition-all text-[#263A29] font-bold"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#41644A] hover:bg-[#263A29] text-white py-5 rounded-[22px] font-black uppercase text-[11px] tracking-widest shadow-xl transition-all active:scale-95"
          >
            {loading ? 'Updating Database...' : 'Save New Password'}
          </button>
        </form>
      </div>
    </div>
  );
}