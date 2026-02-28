import { ImagePlus } from "lucide-react";
import { ImageToPromptDropzone } from "@/components/generator/image-to-prompt-dropzone";
import { createClient } from "@/utils/supabase/server";

export default async function ImageToPromptPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Ambil api_keys dari DB untuk user ini
    const { data: keysData, error: dbError } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

    if (dbError) {
        console.error('Database fetch error:', dbError);
    }

    // Formatting list agar sesuai dengan Dropzone expectations
    const formattedKeys = (keysData || []).map(k => ({
        id: k.id,
        key: k.key_value,
        status: k.status,
        provider: k.provider
    }));
    return (
        <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">
            <div className="flex flex-col gap-2 relative z-10 bg-[#18181b] p-8 rounded-2xl border border-[#27272a] shadow-2xl">
                <div className="flex items-center gap-4 mb-2">
                    <div className="p-3 bg-blue-600/20 rounded-xl border border-blue-500/30">
                        <ImagePlus className="h-7 w-7 text-blue-400" />
                    </div>
                    <h2 className="text-3xl font-black tracking-tighter text-zinc-100 uppercase italic">
                        Image to Prompt AI
                    </h2>
                </div>
                <p className="text-zinc-500 ml-16 max-w-2xl font-bold leading-relaxed">
                    Pengekstrak gambar menjadi deskripsi prompt panjang untuk Text-to-Image (Midjourney/Stable Diffusion). Proses secara batch di browser Anda yang sepenuhnya aman.
                </p>
            </div>
            {/* Main Generator Component Area */}
            <ImageToPromptDropzone initialApiKeys={formattedKeys} />
        </div>
    );
}
