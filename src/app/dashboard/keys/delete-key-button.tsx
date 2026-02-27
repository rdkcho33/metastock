"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteApiKey } from "./actions";

export function DeleteKeyButton({ id }: { id: string }) {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!confirm("Yakin ingin menghapus API Key ini? Alat tidak dapat menggunakannya lagi.")) {
            return;
        }

        setIsDeleting(true);
        const res = await deleteApiKey(id);

        if (res?.error) {
            alert(res.error);
            setIsDeleting(false);
        }
    };

    return (
        <Button
            onClick={handleDelete}
            disabled={isDeleting}
            variant="destructive"
            size="icon"
            className="shrink-0 h-9 w-9 bg-destructive/90 hover:bg-destructive"
        >
            <Trash2 className="h-4 w-4" />
        </Button>
    );
}
