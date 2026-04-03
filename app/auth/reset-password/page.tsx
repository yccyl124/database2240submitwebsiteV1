'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

// IMPORTANT: Added 'default' keyword to satisfy AppPageConfig and fix Vercel Build
export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      return toast.error("Password must be at least 6 characters.");
    }
    
    setLoading(true);

    try {
      // 1. Update password in Supabase Auth (The secure system layer)
      const { data, error: authError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (authError) throw authError;

      // 2. LINK TO CURRENT DATABASE: Update the 'passwordhash' column in 'users' table
      // This is critical because your login/page.tsx checks this column specifically
      if (data.user?.email) {
        const { error: dbError } = await supabase
          .from('users')
          .update({ 
            passwordhash: newPassword // Syncing with your new database column
          }) 
          .eq('email', data.user.email);

        if (dbError) {
          console.error("Database sync failed:", dbError.message);
          // We don't throw here so the user can still try to log in since the Auth layer succeeded
        }
      }

      toast.success('Security credentials updated! Please log in.');
      
      // Clear any stale local data
      localStorage.clear();
      
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
        <div className="flex items-center gap-2 mb-8 justify-center">
            <div className="w-8 h-8 bg-[#41644A] rounded-lg flex items-center justify-center text-white font-black text-xs shadow-lg">g.</div>
            <span className="text-xl font-black text-[#263A29] tracking-tighter">groceria.</span>
        </div>

        <h1 className="text-3xl font-black text-[#263A29] tracking-tighter mb-2 text-center">New Password</h1>
        <p className="text-gray-400 text-sm font-medium mb-8 text-center leading-relaxed px-4">
            Enter your new secure access key to finalize the reset.
        </p>
        
        <form onSubmit={handleUpdatePassword} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                New Secure Password
            </label>
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
            className="w-full bg-[#41644A] hover:bg-[#263A29] text-white py-5 rounded-[22px] font-black uppercase text-[11px] tracking-widest shadow-xl transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Updating Vault...' : 'Sync New Password'}
          </button>
        </form>
      </div>
    </div>
  );
}