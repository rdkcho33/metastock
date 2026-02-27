import { createClient } from "@/utils/supabase/server";
import { Copy, CheckCircle2, Trash2, KeyRound, AlertCircle, RotateCcw, Zap } from "lucide-react";
import { addApiKey, deleteApiKey, resetAllKeys, reactivateApiKey } from "./actions";
import { AddKeyForm } from "./add-key-form";
import { DeleteKeyButton } from "./delete-key-button";
import { EditKeyButton } from "./edit-key-button";
import { Button } from "@/components/ui/button";

export default async function ApiKeysPage() {
    const supabase = await createClient();

    // Ambil data user login aktif
    const { data: { user } } = await supabase.auth.getUser();

    // Ambil Semua key punya dia (RLS aman otomatis ter-filter)
    const { data: keysData, error } = await supabase
        .from('api_keys')
        .select('*')
        .order('created_at', { ascending: false });

    // Walau RLS aman, fallback tipe data jika null
    const keys = keysData || [];

    return (
        <div className="flex flex-col gap-8 max-w-4xl mx-auto">
            <div className="flex flex-col gap-2">
                <div className="flex justify-between items-start">
                    <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        <KeyRound className="h-8 w-8 text-primary" />
                        Kelola API Keys
                    </h2>

                    {keys.some(k => k.status === 'exhausted') && (
                        <form action={resetAllKeys}>
                            <Button variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/10">
                                <RotateCcw className="h-4 w-4" />
                                Reset Semua Status (Re-activate)
                            </Button>
                        </form>
                    )}
                </div>
                <p className="text-muted-foreground mt-2">
                    Tambahkan API Key Google Gemini (gratis) Anda di sini. Sistem akan otomatis menggunakan API Key yang aktif dan beralih ke kunci berikutnya jika satu kunci mencapai batas kuota (Exhausted).
                </p>
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-500 flex items-center gap-2 mt-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span><b>Tips:</b> API Gratis Gemini memiliki limit 15 permintaan per menit. Jika status berubah menjadi 'Exhausted', Anda dapat menekan tombol Reset untuk menggunakannya kembali setelah menunggu 1 menit.</span>
                </div>
            </div>

            {/* Add New Key Form (Client Component) */}
            <AddKeyForm />

            {/* List Keys */}
            <div className="rounded-xl border border-border/50 bg-card/30 overflow-hidden">
                <div className="border-b border-border/50 bg-muted/20 px-6 py-4 flex justify-between items-center">
                    <h3 className="font-semibold text-lg">Daftar Kunci Tersimpan</h3>
                    <span className="text-sm bg-primary/10 text-primary px-3 py-1 rounded-full">{keys.length} Kunci</span>
                </div>

                <div className="divide-y divide-border/50">
                    {keys.map((k) => (
                        <div key={k.id} className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-muted/5 transition-colors">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-3">
                                    <h4 className="font-medium">{k.name}</h4>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${k.provider === 'groq' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                        {k.provider}
                                    </span>
                                    {k.status === 'active' ? (
                                        <span className="flex items-center gap-1 text-xs font-medium text-green-500 bg-green-500/10 px-2 py-0.5 rounded">
                                            <CheckCircle2 className="h-3 w-3" />
                                            Active
                                        </span>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <span className="flex items-center gap-1 text-xs font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded">
                                                <AlertCircle className="h-3 w-3" />
                                                Exhausted (Limit)
                                            </span>
                                            <form action={reactivateApiKey.bind(null, k.id)}>
                                                <button type="submit" className="text-[10px] text-primary hover:underline flex items-center gap-1 font-bold">
                                                    <Zap className="h-3 w-3" /> Aktifkan Lagi
                                                </button>
                                            </form>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono mt-1">
                                    {k.key_value.substring(0, 10)}...{k.key_value.substring(k.key_value.length - 4)}
                                </div>
                            </div>

                            <div className="flex items-center gap-6 w-full sm:w-auto mt-4 sm:mt-0">
                                <div className="flex flex-col items-end">
                                    <span className="text-sm text-muted-foreground">Requests</span>
                                    <span className="font-medium text-foreground">{k.usage_count || 0}</span>
                                </div>
                                <div className="h-10 w-px bg-border/50 hidden sm:block"></div>
                                <div className="flex items-center gap-2">
                                    <EditKeyButton
                                        id={k.id}
                                        initialName={k.name}
                                        initialKey={k.key_value}
                                    />
                                    <DeleteKeyButton id={k.id} />
                                </div>
                            </div>
                        </div>
                    ))}

                    {keys.length === 0 && (
                        <div className="p-12 text-center text-muted-foreground">
                            Belum ada API Key yang tersimpan.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
