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
            <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-sidebar backdrop-blur-xl sm:flex transition-colors">
                <div className="flex h-16 items-center px-6 border-b border-border/50">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                        AutoMeta
                    </h2>
                </div>

                <div className="p-4 flex flex-col gap-1">
                    <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Generator Tools
                    </h3>
                    <nav className="flex flex-col gap-1.5">
                        <Link
                            href="/dashboard/metadata-microstock"
                            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-accent hover:text-accent-foreground group"
                        >
                            <Tags className="h-4 w-4 text-primary/70 group-hover:text-primary transition-colors" />
                            Auto Metadata (CSV)
                        </Link>
                        <Link
                            href="/dashboard/image-to-prompt"
                            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground group"
                        >
                            <ImagePlus className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            Image to Prompt
                        </Link>
                    </nav>
                </div>

                <div className="p-4 flex flex-col gap-1 mt-4 border-t border-border/50">
                    <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Preferences
                    </h3>
                    <nav className="flex flex-col gap-1.5">
                        <Link
                            href="/dashboard/keys"
                            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground group"
                        >
                            <Settings className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                            API Keys / LLMs
                        </Link>
                    </nav>
                </div>

                <div className="mt-auto p-4 border-t border-border/50">
                    <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                        <LogOut className="h-4 w-4" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 sm:pl-64 flex flex-col min-h-screen">
                {/* Header (Top Nav) */}
                <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border/40 bg-background/80 px-6 sm:px-8 backdrop-blur-md">
                    <div className="w-full flex-1">
                        <h1 className="text-lg font-medium text-foreground/90">Dashboard</h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 cursor-pointer hover:bg-primary/30 transition-colors">
                            <span className="text-sm font-medium text-primary">U</span>
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
