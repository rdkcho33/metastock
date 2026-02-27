import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'Auto Metadata Generator | Microstock',
    description: 'Proses ratusan gambar dengan Gemini AI secara lokal dan hasilkan spesifikasi format Adobe Stock siap ekspor.',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="dark">
            <body>
                <div className="relative min-h-screen bg-background flex flex-col items-center">
                    {/* Ambient Background Glow Effect */}
                    <div className="absolute top-0 opacity-40 z-[-1] min-h-screen w-full bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]"></div>
                    {children}
                </div>
            </body>
        </html>
    );
}
