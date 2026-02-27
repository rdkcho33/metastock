import { login, signup } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { KeyRound, Mail, Lock } from 'lucide-react'

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string; message?: string }>
}) {
    const resolvedSearchParams = await searchParams;

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
            {/* Ornamen Background */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
                <div className="h-[40rem] w-[40rem] rounded-full bg-primary/20 blur-[100px]" />
            </div>

            <div className="relative z-10 w-full max-w-[400px] rounded-2xl border border-border/50 bg-card/60 p-8 shadow-2xl backdrop-blur-xl">
                <div className="mb-8 flex flex-col items-center text-center">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/20 shadow-inner">
                        <KeyRound className="h-7 w-7 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        Selamat Datang di AutoMeta
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Masuk ke akun Anda untuk mulai mengenerate Metadata secara massal.
                    </p>
                </div>

                <form className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-foreground/80" htmlFor="email">
                            Email
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="nama@email.com"
                                required
                                className="pl-10"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-foreground/80" htmlFor="password">
                            Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="••••••••"
                                required
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {resolvedSearchParams?.message && (
                        <div className="mt-2 rounded-lg bg-green-500/15 p-3 text-sm text-green-500 border border-green-500/20 text-center">
                            {resolvedSearchParams.message}
                        </div>
                    )}

                    {resolvedSearchParams?.error && (
                        <div className="mt-2 rounded-lg bg-destructive/15 p-3 text-sm text-destructive border border-destructive/20 text-center">
                            {resolvedSearchParams.error}
                        </div>
                    )}

                    <div className="mt-4 flex flex-col gap-3">
                        <Button
                            formAction={login}
                            className="w-full bg-gradient-to-r from-primary to-blue-500 font-medium text-white shadow-lg transition-transform hover:scale-[1.02]"
                        >
                            Sign In
                        </Button>

                        <div className="relative mt-2 mb-2 flex items-center py-2">
                            <div className="flex-grow border-t border-border/50"></div>
                            <span className="shrink-0 px-4 text-xs text-muted-foreground uppercase tracking-widest">Atau</span>
                            <div className="flex-grow border-t border-border/50"></div>
                        </div>

                        <Button
                            formAction={signup}
                            variant="outline"
                            className="w-full text-foreground/80 font-medium hover:bg-muted"
                        >
                            Daftar Akun Baru
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
