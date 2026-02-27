import { ImageDropzone } from "@/components/generator/image-dropzone";
import { Tags } from "lucide-react";
import { createClient } from "@/utils/supabase/server";

export default async function MetadataMicrostockPage() {
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

    // Formatting format property Dropzone lama (penyesuaian array object)
    const formattedKeys = (keysData || []).map(k => ({
        id: k.id,
        key: k.key_value,
        status: k.status,
        provider: k.provider
    }));
    return (
        <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">
            <div className="flex flex-col gap-2 relative z-10 bg-card p-6 rounded-xl border border-border/40 shadow-sm">
                <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Tags className="h-6 w-6 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">
                        Auto Metadata Microstock
                    </h2>
                </div>
                <p className="text-muted-foreground ml-11 max-w-2xl">
                    Upload puluhan atau ratusan gambar. Aplikasi mengekstrak 40-50 Keywords dan Kategori JSON yang siap diekspor menjadi CSV standar Adobe Stock.
                </p>
            </div>

            {/* Main Generator Component Area */}
            <ImageDropzone initialApiKeys={formattedKeys} />
        </div>
    );
}
