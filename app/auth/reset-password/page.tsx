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

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else {
      toast.success('Password updated successfully!');
      router.push('/auth/login');
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f4f1] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl p-10">
        <h1 className="text-2xl font-black text-[#263A29] mb-6">Set New Password</h1>
        <form onSubmit={handleUpdatePassword} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">New Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              className="w-full p-4 bg-[#f8f9f7] rounded-2xl outline-none border border-transparent focus:border-[#41644A]/30 transition-all text-[#263A29] font-semibold"
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#41644A] hover:bg-[#263A29] text-white py-4 rounded-2xl font-bold transition-all"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}