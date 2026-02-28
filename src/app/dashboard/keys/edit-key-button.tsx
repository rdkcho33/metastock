"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit2, Save, X } from "lucide-react";
import { updateApiKey } from "./actions";

interface EditKeyButtonProps {
    id: string;
    initialName: string;
    initialKey: string;
}

export function EditKeyButton({ id, initialName, initialKey }: EditKeyButtonProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const formRef = useRef<HTMLFormElement>(null);

    const handleUpdate = async (formData: FormData) => {
        setIsLoading(true);
        setError(null);

        const res = await updateApiKey(id, formData);

        if (res?.error) {
            setError(res.error);
            setIsLoading(false);
        } else {
            setIsEditing(false);
            setIsLoading(false);
        }
    };

    if (!isEditing) {
        return (
            <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                size="icon"
                className="shrink-0 h-10 w-10 border-[#27272a] bg-zinc-800 text-zinc-400 hover:bg-blue-600 hover:text-white transition-all rounded-xl shadow-xl active:scale-90"
            >
                <Edit2 className="h-4 w-4" />
            </Button>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-[#18181b] border border-[#27272a] rounded-3xl p-8 w-full max-w-md shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600/20 rounded-xl border border-blue-500/30">
                            <Edit2 className="h-5 w-5 text-blue-400" />
                        </div>
                        <h3 className="font-black text-xs uppercase tracking-[0.2em] text-zinc-100">Modify Credentials</h3>
                    </div>
                    <button onClick={() => setIsEditing(false)} className="text-zinc-500 hover:text-white transition-colors bg-white/5 p-2 rounded-xl border border-white/5">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form action={handleUpdate} className="flex flex-col gap-6">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Label Name</label>
                        <Input name="name" defaultValue={initialName} placeholder="TAG NAME" className="h-12 bg-[#13131a] border-[#27272a] focus-visible:ring-blue-500/50 text-zinc-100 font-bold rounded-xl px-5" />
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">API Key Secret</label>
                        <Input name="key_value" defaultValue={initialKey} type="password" placeholder="SECRET VALUE" required className="h-12 bg-[#13131a] border-[#27272a] focus-visible:ring-blue-500/50 text-zinc-100 font-mono rounded-xl px-5" />
                    </div>

                    {error && <p className="text-[10px] font-black text-red-400 uppercase tracking-widest italic">{error}</p>}

                    <div className="flex gap-4 mt-6">
                        <Button
                            type="button"
                            variant="ghost"
                            className="flex-1 h-12 text-xs font-black uppercase tracking-widest text-zinc-500 hover:bg-zinc-800 rounded-xl px-8"
                            onClick={() => setIsEditing(false)}
                            disabled={isLoading}
                        >
                            CANCEL
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 h-12 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest rounded-xl shadow-xl transition-all active:scale-95 border-b-4 border-blue-800"
                            disabled={isLoading}
                        >
                            {isLoading ? "SAVING..." : "UPDATE"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
