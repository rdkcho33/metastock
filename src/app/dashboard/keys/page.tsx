import { createClient } from "@/utils/supabase/server";
import { CheckCircle2, KeyRound, Info } from "lucide-react";
import { addApiKey, deleteApiKey } from "./actions";
import { AddKeyForm } from "./add-key-form";
import { DeleteKeyButton } from "./delete-key-button";
import { EditKeyButton } from "./edit-key-button";

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
        <div className="flex flex-col gap-8 max-w-5xl mx-auto w-full animate-in fade-in duration-700">
            <div className="flex flex-col gap-4 bg-[#18181b] p-8 rounded-2xl border border-[#27272a] shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none"></div>
                <div className="flex justify-between items-start relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-600/20 rounded-xl border border-blue-500/30">
                            <KeyRound className="h-7 w-7 text-blue-400" />
                        </div>
                        <h2 className="text-3xl font-black tracking-tighter text-zinc-100 uppercase italic">
                            API KEYS MANAGER
                        </h2>
                    </div>
                </div>
                <p className="text-zinc-500 ml-16 max-w-3xl font-bold leading-relaxed">
                    Kelola kunci API Gemini &amp; Groq Anda. Sistem akan menggunakan key pertama sampai limit, lalu otomatis beralih ke key berikutnya.
                </p>
                <div className="p-4 bg-blue-600/10 border border-blue-500/20 rounded-xl text-[11px] font-black text-blue-400 flex items-center gap-3 mt-2 ml-16 shadow-inner uppercase tracking-wider">
                    <Info className="h-4 w-4 shrink-0" />
                    <span>Jika key mencapai limit harian, sistem otomatis pindah ke key selanjutnya. Limit biasanya di-reset otomatis oleh provider keesokan harinya.</span>
                </div>
            </div>

            {/* Add New Key Form (Client Component) */}
            <AddKeyForm />

            {/* List Keys */}
            <div className="rounded-2xl border border-[#27272a] bg-[#1c1c21] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                <div className="border-b border-[#27272a] bg-[#18181b] px-8 py-6 flex justify-between items-center">
                    <h3 className="font-black text-sm uppercase tracking-[0.2em] text-zinc-100">Stored Credentials</h3>
                    <span className="text-[10px] font-black bg-blue-600 text-white px-4 py-1.5 rounded-lg shadow-lg italic uppercase tracking-widest">{keys.length} KEYS FOUND</span>
                </div>

                <div className="divide-y divide-[#27272a]/50">
                    {keys.map((k, index) => (
                        <div key={k.id} className="p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 hover:bg-[#1f1f26] transition-all group">
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-4">
                                    <span className="text-[10px] font-black text-zinc-500 bg-zinc-800 px-2.5 py-1 rounded-lg border border-zinc-700 uppercase tracking-widest">
                                        #{index + 1}
                                    </span>
                                    <h4 className="font-black text-lg text-zinc-100 uppercase tracking-tight">{k.name}</h4>
                                    <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest italic border shadow-sm ${k.provider === 'groq' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                        {k.provider}
                                    </span>
                                    <span className="flex items-center gap-2 text-[10px] font-black text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-lg border border-emerald-400/20 uppercase tracking-widest">
                                        <CheckCircle2 className="h-3 w-3" />
                                        ACTIVE
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-zinc-500 font-mono mt-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5 w-fit shadow-inner">
                                    <KeyRound className="h-3 w-3 opacity-50" />
                                    {k.key_value.substring(0, 10)}...{k.key_value.substring(k.key_value.length - 8)}
                                </div>
                            </div>

                            <div className="flex items-center gap-8 w-full sm:w-auto mt-4 sm:mt-0">
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Total Hits</span>
                                    <span className="text-xl font-black text-zinc-100 italic shadow-sm">{k.usage_count || 0}</span>
                                </div>
                                <div className="h-12 w-px bg-[#27272a] hidden sm:block"></div>
                                <div className="flex items-center gap-3">
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
                        <div className="p-20 text-center text-zinc-500 flex flex-col items-center gap-4">
                            <KeyRound className="h-12 w-12 opacity-10" />
                            <p className="font-black uppercase tracking-widest italic opacity-40">Belum ada API Key yang tersimpan.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
