"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import Image from 'next/image';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

function LoginContent() {
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const next = searchParams.get('next') || '/dashboard';
        router.push(next);
      }
    };
    checkUser();
  }, [supabase, router, searchParams]);

  const handleOAuthLogin = async (provider: 'github' | 'google') => {
    setLoading(provider);
    const next = searchParams.get('next') || '/dashboard';
    const options: any = {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
    };
    if (provider === 'github') {
      options.scopes = 'repo read:user read:org';
      options.queryParams = { prompt: 'consent' };
    }
    await supabase.auth.signInWithOAuth({
      provider,
      options,
    });
  };

  const GitHubIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
    </svg>
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground p-4 selection:bg-[var(--green)] selection:text-black">
      <div className="absolute top-0 left-0 right-0">
        <div className="mx-auto flex h-14 max-w-7xl items-center px-5 md:px-8">
          <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
            <Image src="/logo-light.png" width={384} height={96} alt="Deptic Logo" className="h-24 w-auto dark:hidden" priority />
            <Image src="/logo-dark.png" width={384} height={96} alt="Deptic Logo" className="h-24 w-auto hidden dark:block" priority />
          </Link>
        </div>
      </div>

      <div className="w-full max-w-[400px] flex flex-col items-center">
        <div className="text-center mb-10 w-full">
          <h1 className="text-3xl font-syne font-bold mb-3 tracking-tight text-foreground">Welcome back</h1>
          <p className="text-muted-foreground text-sm">Sign in to your account to continue</p>
        </div>

        {error && (
          <div className="mb-6 w-full p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-sm text-red-400">
            <AlertCircle size={18} className="shrink-0" />
            <span>Authentication failed. Please try again.</span>
          </div>
        )}

        <div className="w-full space-y-3">
          <button 
            onClick={() => handleOAuthLogin('github')}
            disabled={loading !== null}
            className={cn(
              "w-full h-12 flex items-center justify-center gap-3 rounded-lg text-sm font-medium transition-all",
              "bg-[var(--green)] text-black hover:bg-[var(--green)]/90",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {loading === 'github' ? (
              <div className="h-4 w-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
            ) : (
              <GitHubIcon className="h-5 w-5" />
            )}
            Continue with GitHub
          </button>

          <button 
            onClick={() => handleOAuthLogin('google')}
            disabled={loading !== null}
            className={cn(
              "w-full h-12 flex items-center justify-center gap-3 rounded-lg text-sm font-medium transition-all",
              "bg-card text-foreground hover:bg-muted border border-border hover:border-border",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {loading === 'google' ? (
              <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            Continue with Google
          </button>
        </div>

        <p className="mt-10 text-xs text-muted-foreground text-center max-w-[280px]">
          By continuing, you agree to DEPTIC's{' '}
          <Link href="/terms" className="text-muted-foreground hover:text-foreground underline underline-offset-4 decoration-border hover:decoration-muted-foreground transition-colors">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-muted-foreground hover:text-foreground underline underline-offset-4 decoration-border hover:decoration-muted-foreground transition-colors">
            Privacy Policy
          </Link>.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen bg-[var(--lp-surface)] items-center justify-center"><div className="h-8 w-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div></div>}>
      <LoginContent />
    </Suspense>
  );
}
