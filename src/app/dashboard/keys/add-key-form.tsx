"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addApiKey } from "./actions";

export function AddKeyForm() {
    const formRef = useRef<HTMLFormElement>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function clientAction(formData: FormData) {
        setIsLoading(true);
        setError(null);

        try {
            const res = await addApiKey(formData);
            if (res?.error) {
                setError(res.error);
            } else {
                formRef.current?.reset();
            }
        } catch (err: any) {
            setError(err.message || "Something went wrong");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="rounded-2xl border border-[#27272a] bg-[#18181b] p-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none"></div>
            <h3 className="font-black text-xs uppercase tracking-[0.2em] text-zinc-100 mb-6 flex items-center gap-2">
                <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
                Register New Credentials
            </h3>
            <form ref={formRef} action={clientAction} className="flex flex-col gap-5 relative z-10">
                <div className="flex flex-col lg:flex-row gap-4">
                    <select
                        name="provider"
                        required
                        className="flex h-12 w-full lg:w-48 rounded-xl border border-[#27272a] bg-[#13131a] px-4 py-2 text-sm font-bold text-zinc-100 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 transition-all appearance-none cursor-pointer hover:border-zinc-700 shadow-inner"
                    >
                        <option value="gemini">GOOGLE GEMINI</option>
                        <option value="groq">GROQ LLAMA VISION</option>
                    </select>

                    <Input
                        name="name"
                        placeholder="TAG NAME (e.g. Personal Key)"
                        className="lg:w-64 h-12 bg-[#13131a] border-[#27272a] focus-visible:ring-blue-500/50 text-zinc-100 font-bold placeholder:text-zinc-600 rounded-xl px-5"
                    />

                    <Input
                        name="key_value"
                        placeholder="API KEY (AIzaSy... / gsk_...)"
                        className="flex-1 h-12 bg-[#13131a] border-[#27272a] focus-visible:ring-blue-500/50 text-zinc-100 font-mono placeholder:text-zinc-600 rounded-xl px-5"
                        type="password"
                        required
                    />

                    <Button disabled={isLoading} type="submit" className="h-12 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest px-8 rounded-xl shadow-xl transition-all active:scale-95 border-b-4 border-blue-800 disabled:opacity-50">
                        {isLoading ? (
                            <div className="flex items-center gap-2">
                                <span className="animate-spin h-4 w-4 border-2 border-white/20 border-t-white rounded-full"></span>
                                SAVING...
                            </div>
                        ) : "SAVE KEY"}
                    </Button>
                </div>

                {error && <p className="text-xs font-black text-red-400 mt-1 uppercase tracking-widest italic">{error}</p>}

                <p className="text-[10px] text-zinc-500 mt-2 font-bold uppercase tracking-widest opacity-60">
                    Your API keys are encrypted at rest and never shared. Data is processed locally and via official API endpoints.
                </p>
            </form>
        </div>
    );
}
