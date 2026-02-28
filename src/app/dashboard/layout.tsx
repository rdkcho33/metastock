import Link from "next/link";
import { ImagePlus, Tags, Settings, LogOut } from "lucide-react";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen w-full bg-background selection:bg-primary/20">
            {/* Sidebar Navigation */}
            <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-[#27272a] bg-[#0c0c0e] sm:flex shadow-2xl transition-all">
                <div className="flex h-16 items-center px-6 border-b border-[#27272a]">
                    <h2 className="text-xl font-black tracking-tight text-zinc-100 uppercase">
                        AutoMeta
                    </h2>
                </div>

                <div className="p-4 flex flex-col gap-1">
                    <h3 className="px-3 text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">
                        Generator Tools
                    </h3>
                    <nav className="flex flex-col gap-2">
                        <Link
                            href="/dashboard/metadata-microstock"
                            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-zinc-100 transition-all hover:bg-zinc-800 hover:text-white border border-transparent hover:border-zinc-700 group shadow-sm"
                        >
                            <Tags className="h-4 w-4 text-blue-500 group-hover:text-blue-400 transition-colors" />
                            Auto Metadata (CSV)
                        </Link>
                        <Link
                            href="/dashboard/image-to-prompt"
                            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-zinc-400 transition-all hover:bg-zinc-800 hover:text-zinc-100 border border-transparent hover:border-zinc-700 group shadow-sm"
                        >
                            <ImagePlus className="h-4 w-4 group-hover:text-blue-400 transition-colors" />
                            Image to Prompt
                        </Link>
                    </nav>
                </div>

                <div className="p-4 flex flex-col gap-1 mt-6">
                    <h3 className="px-3 text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">
                        Preferences
                    </h3>
                    <nav className="flex flex-col gap-2">
                        <Link
                            href="/dashboard/keys"
                            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-zinc-400 transition-all hover:bg-zinc-800 hover:text-zinc-100 border border-transparent hover:border-zinc-700 group shadow-sm"
                        >
                            <Settings className="h-4 w-4 group-hover:text-zinc-100 transition-colors" />
                            API Keys / LLMs
                        </Link>
                    </nav>
                </div>

                <div className="mt-auto p-4 border-t border-[#27272a]">
                    <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-zinc-400 hover:text-red-400 hover:bg-red-400/10 transition-all active:scale-95">
                        <LogOut className="h-4 w-4" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 sm:pl-64 flex flex-col min-h-screen">
                {/* Header (Top Nav) */}
                <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-[#27272a] bg-[#09090b] px-6 sm:px-8">
                    <div className="w-full flex-1">
                        <h1 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-100">DASHBOARD MODULE</h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center border-b-2 border-blue-800 cursor-pointer hover:bg-blue-500 transition-all active:scale-95 shadow-lg">
                            <span className="text-xs font-black text-white">IL</span>
                        </div>
                    </div>
                </header>

                <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
                    {children}
                </div>
            </main>
        </div>
    );
}
