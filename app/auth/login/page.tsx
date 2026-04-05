'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // --- STEP A: CUSTOM TABLE CHECK ---
      const { data: user, error: dbError } = await supabase
        .from('users')
        .select('userid, email, passwordhash, role')
        .eq('email', email.trim())
        .single();

      if (dbError || !user) {
        throw new Error("Account not found in database.");
      }
      
      // Manual password validation
      if (String(user.passwordhash).trim() !== password.trim()) {
        throw new Error("Incorrect password.");
      }

      // --- STEP B: SUPABASE AUTH ACTIVATION (For RLS) ---
      // Sign in the session so RLS policies can see the user's JWT
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (authError) {
        console.warn("RLS Auth Layer Warning:", authError.message);
      }

      // --- STEP C: SAVE SESSION & REDIRECT ---
      localStorage.setItem('role', user.role);
      localStorage.setItem('userEmail', user.email);
      localStorage.setItem('userId', user.userid.toString());

      toast.success(`Welcome back!`);
      
      const roleKey = user.role.toLowerCase().trim();
      const paths: Record<string, string> = {
        'restocker': '/restocker',
        'manager': '/manager',
        'staff': '/staff',
        'customer': '/customer',
      };
      
      const targetPath = paths[roleKey] || '/';
      router.push(targetPath);
      router.refresh();

    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
      setLoading(false);
    }
  };

  const handleGuestEntry = () => {
    localStorage.setItem('role', 'guest');
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    toast.success("Entering as Guest");
    router.push('/');
    router.refresh();
  };

  return (
    <div className="h-screen w-screen bg-[#f3f4f1] flex items-center justify-center p-6 overflow-hidden">
      <div className="flex flex-col lg:flex-row w-full max-w-5xl bg-white rounded-[40px] shadow-2xl overflow-hidden h-full max-h-[700px]">
        
        {/* Left Side: Branding */}
        <div className="hidden lg:flex lg:w-[42%] bg-[#41644A] p-12 flex-col justify-center relative text-white">
          <span className="absolute top-8 left-10 text-8xl opacity-10 font-serif select-none">“</span>
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3 mb-2">
               <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#41644A] font-black text-xl">g.</div>
               <span className="text-2xl font-black tracking-tighter">groceria.</span>
            </div>
            <h2 className="text-4xl font-black leading-tight">Freshness Delivered, <br /> Just for You.</h2>
            <div className="w-16 h-1 bg-white/40 rounded-full" />
            <p className="text-white/80 text-sm font-medium leading-relaxed">
              Log in to access your personalized shopping list, loyalty rewards, and store management tools.
            </p>
          </div>
          <span className="absolute bottom-4 right-10 text-8xl opacity-10 font-serif rotate-180 select-none">“</span>
        </div>

        {/* Right Side: Form */}
        <div className="w-full lg:w-[58%] p-10 lg:px-16 flex flex-col justify-center overflow-y-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-black text-[#263A29]">Welcome Back!</h1>
            <p className="text-gray-400 text-sm font-medium mt-1">Sign in to manage your account.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
              <input 
                type="email" 
                placeholder="email@example.com" 
                className="w-full p-4 bg-[#f8f9f7] rounded-2xl outline-none border border-transparent focus:border-[#41644A]/30 transition-all text-[#263A29] text-sm font-semibold"
                value={email || ''} 
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Password</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                className="w-full p-4 bg-[#f8f9f7] rounded-2xl outline-none border border-transparent focus:border-[#41644A]/30 transition-all text-[#263A29] text-sm font-semibold"
                value={password || ''}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <div className="flex justify-end">
                {/* FIX: Removed invalid 'size' prop */}
                <Link href="/auth/forgot-password" className="text-[10px] font-bold text-[#41644A] hover:underline">
                    Forgot password?
                </Link>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#41644A] hover:bg-[#263A29] text-white py-4 rounded-2xl font-bold shadow-lg transition-transform active:scale-[0.98]"
            >
              {loading ? 'Verifying...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 space-y-4">
            <div className="relative flex items-center">
              <div className="flex-grow border-t border-gray-100"></div>
              <span className="flex-shrink mx-4 text-[9px] font-bold text-gray-300 uppercase tracking-[0.2em]">Or</span>
              <div className="flex-grow border-t border-gray-100"></div>
            </div>

            <button 
                onClick={handleGuestEntry}
                className="w-full text-center py-4 rounded-2xl border-2 border-[#41644A]/10 text-[#41644A] text-sm font-bold hover:bg-[#f3f4f1] transition-all"
            >
              Continue as Guest
            </button>

            <p className="text-center text-xs font-bold text-gray-300">
              New here? <Link href="/auth/register" className="text-[#41644A] font-black hover:underline ml-1">Create an account</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}