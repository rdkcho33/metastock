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
        <div className="rounded-xl border border-border/50 bg-card/30 p-6 backdrop-blur-sm">
            <h3 className="font-semibold text-lg mb-4">Tambah Kunci Baru</h3>
            <form ref={formRef} action={clientAction} className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <select
                        name="provider"
                        required
                        className="flex h-10 w-full sm:w-1/4 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                        <option value="gemini">Google Gemini</option>
                        <option value="groq">Groq Llama Vision</option>
                    </select>

                    <Input
                        name="name"
                        placeholder="Nama Label (c: Key Pribadi)"
                        className="sm:w-1/3"
                    />

                    <Input
                        name="key_value"
                        placeholder="cth: AIzaSy... / gsk_..."
                        className="flex-1"
                        type="password"
                        required
                    />

                    <Button disabled={isLoading} type="submit">
                        {isLoading ? "Menyimpan..." : "Simpan Key"}
                    </Button>
                </div>

                {error && <p className="text-xs text-destructive mt-1">{error}</p>}

                <p className="text-xs text-muted-foreground mt-3">
                    Kunci API Anda akan tersimpan dengan aman dengan enkripsi RLS di Supabase dan hanya dapat dipanggil oleh akun Anda sendiri.
                </p>
            </form>
        </div>
    );
}
