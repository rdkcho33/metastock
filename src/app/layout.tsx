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
                <div className="relative min-h-screen bg-background flex flex-col items-center w-full">
                    {/* Clean Dark background - no distracting glows */}
                    {children}
                </div>
            </body>
        </html>
    );
}
