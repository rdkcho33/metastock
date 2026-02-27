import Link from "next/link";

export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24 text-center">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-6">
                Auto Metadata <span className="text-primary">Microstock</span>
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mb-12">
                Proses massal gambar Anda menggunakan AI Google Gemini secara lokal.
                Otomatisasikan pembuatan Title, Keywords, dan Category tanpa batas server.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
                <Link
                    href="/dashboard"
                    className="px-8 py-3 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/25"
                >
                    Masuk ke Dashboard
                </Link>
                <Link
                    href="/login"
                    className="px-8 py-3 rounded-md bg-secondary text-secondary-foreground font-semibold hover:bg-secondary/80 transition-all"
                >
                    Login
                </Link>
            </div>
        </main>
    );
}
