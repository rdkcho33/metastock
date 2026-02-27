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
                className="shrink-0 h-9 w-9 border-border/50 hover:bg-primary/10 hover:text-primary transition-colors"
            >
                <Edit2 className="h-4 w-4" />
            </Button>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card border border-border/50 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-xl">Edit API Key</h3>
                    <button onClick={() => setIsEditing(false)} className="text-muted-foreground hover:text-foreground">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form action={handleUpdate} className="flex flex-col gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Label Name</label>
                        <Input name="name" defaultValue={initialName} placeholder="cth: Key Utama" />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">API Key Value</label>
                        <Input name="key_value" defaultValue={initialKey} type="password" placeholder="AIza... / gsk_..." required />
                    </div>

                    {error && <p className="text-xs text-destructive">{error}</p>}

                    <div className="flex gap-3 mt-4">
                        <Button
                            type="button"
                            variant="ghost"
                            className="flex-1"
                            onClick={() => setIsEditing(false)}
                            disabled={isLoading}
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 bg-primary hover:bg-primary/90"
                            disabled={isLoading}
                        >
                            {isLoading ? "Menyimpan..." : "Simpan Perubahan"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
