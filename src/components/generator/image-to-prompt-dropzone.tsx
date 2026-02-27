"use client";

import { useCallback, useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, XCircle, Settings, Play, CheckCircle2, AlertCircle, Edit2, Save, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resizeImageFile } from "@/lib/image-helper";
import { GeminiService } from "@/lib/gemini-service";
import { GroqService } from "@/lib/groq-service";
import { markKeyExhausted } from "@/app/dashboard/keys/actions";

export interface PromptProcessingFile {
    id: string;
    file: File;
    preview: string;
    status: "idle" | "compressing" | "processing" | "done" | "failed";
    prompt?: string;
    error?: string;
    isEditing?: boolean;
}

export function ImageToPromptDropzone({
    initialApiKeys = []
}: {
    initialApiKeys?: { id: string, key: string, status: string, provider: string }[]
}) {
    const [files, setFiles] = useState<PromptProcessingFile[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const [apiKeys, setApiKeys] = useState(initialApiKeys);
    const [variationLevel, setVariationLevel] = useState(0);

    // Sinkronisasi Prop Update
    useEffect(() => {
        setApiKeys(initialApiKeys);
    }, [initialApiKeys]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const newFiles: PromptProcessingFile[] = acceptedFiles.map((file) => ({
            id: Math.random().toString(36).substring(7),
            file,
            preview: URL.createObjectURL(file),
            status: "idle"
        }));

        setFiles((prev) => [...prev, ...newFiles]);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            "image/jpeg": [".jpg", ".jpeg"],
            "image/png": [".png"],
            "image/webp": [".webp"]
        }
    });

    const getActiveKeyObj = () => apiKeys.find(k => k.status === "active");

    const processSingleFile = async (
        fileObj: PromptProcessingFile,
        currentKeyObj: { key: string, provider: string }
    ) => {
        try {
            setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: "compressing" } : f));
            const base64Data = await resizeImageFile(fileObj.file, 1024);
            setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: "processing" } : f));

            let responsePrompt = "";
            if (currentKeyObj.provider === "groq") {
                responsePrompt = await GroqService.generatePrompt(currentKeyObj.key, base64Data, variationLevel);
            } else {
                responsePrompt = await GeminiService.generatePrompt(currentKeyObj.key, base64Data, variationLevel);
            }

            setFiles(prev => prev.map(f => f.id === fileObj.id ? {
                ...f,
                status: "done",
                prompt: responsePrompt
            } : f));

            return { success: true };
        } catch (err: any) {
            if (err.message === "QUOTA_EXCEEDED" || err.message?.includes("429") || err.message?.includes("limit")) {
                return { success: false, error: "QUOTA_EXCEEDED" };
            }
            setFiles(prev => prev.map(f => f.id === fileObj.id ? {
                ...f, status: "failed", error: err.message || "Unknown error"
            } : f));
            return { success: false, error: err.message || "Unknown error" };
        }
    };

    const handleStartProcess = async () => {
        if (isProcessing) return;

        const activeKeys = apiKeys.filter(k => k.status === "active");
        if (activeKeys.length === 0) {
            alert("Tidak ada API Key aktif. Tambahkan di menu Kelola API Keys.");
            return;
        }

        setIsProcessing(true);
        const pendingFiles = files.filter(f => f.status === "idle" || f.status === "failed");

        let currentKeyIndex = 0;

        for (const fileObj of pendingFiles) {
            let attemptSuccessful = false;

            while (!attemptSuccessful && currentKeyIndex < activeKeys.length) {
                const currentKey = activeKeys[currentKeyIndex];
                const result = await processSingleFile(fileObj, currentKey);

                if (result.success) {
                    attemptSuccessful = true;
                } else if (result.error === "QUOTA_EXCEEDED") {
                    console.warn(`Key index ${currentKeyIndex} exhausted. Marking in DB and trying next key...`);

                    // Mark key as exhausted in DB so it won't be picked up on next page refresh
                    await markKeyExhausted(currentKey.id);

                    currentKeyIndex++;
                    if (currentKeyIndex >= activeKeys.length) {
                        alert("Semua API Key yang aktif saat ini telah mencapai limit (429).\n\nTips: API gratis biasanya memiliki limit per menit. Silakan tunggu 1-2 menit, lalu klik 'Reset Semua Status' di menu Kelola API Keys untuk mencoba kembali.");
                        setIsProcessing(false);
                        return;
                    }
                } else {
                    attemptSuccessful = true;
                }
            }

            await new Promise(r => setTimeout(r, 1000));
        }

        setIsProcessing(false);
    };

    const handleCopyAll = () => {
        const doneFiles = files.filter(f => f.status === "done" && f.prompt);
        if (doneFiles.length === 0) return;
        const text = doneFiles.map((f) => f.prompt).join("\n\n");
        navigator.clipboard.writeText(text);
        alert("Semua prompt berhasil disalin!");
    };

    const handleRemoveItem = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    const handleClearAll = () => {
        if (isProcessing) return;
        setFiles([]);
    };

    const toggleEdit = (id: string) => {
        setFiles(prev => prev.map(f => f.id === id ? { ...f, isEditing: !f.isEditing } : f));
    };

    const updatePrompt = (id: string, value: string) => {
        setFiles(prev => prev.map(f => f.id === id ? { ...f, prompt: value } : f));
    };

    const handleExportTXT = () => {
        const doneFiles = files.filter(f => f.status === "done" && f.prompt);
        if (doneFiles.length === 0) return;
        const textContent = doneFiles.map((f) => f.prompt).join("\n\n");
        const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "image_prompts.txt");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const doneCount = files.filter(f => f.status === "done").length;

    return (
        <div className="flex flex-col gap-6 w-full mt-4">
            {/* Settings Row */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-card/80 p-5 border border-border/50 rounded-xl backdrop-blur-md shadow-xl">
                <div className="flex items-center gap-4">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20 text-blue-500 shadow-inner">
                        <Settings className="h-5 w-5" />
                    </span>
                    <div>
                        <h4 className="font-bold text-base text-foreground">Prompt AI Variation Settings</h4>
                        <p className="text-xs text-muted-foreground">Sesuaikan seberapa mirip hasil dengan foto asli</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6 w-full md:w-auto">
                    {/* Variation Slider */}
                    <div className="flex flex-col gap-1 w-full sm:w-48">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Originality Change</span>
                            <span className="text-[10px] font-mono bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded">{variationLevel}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="80"
                            step="10"
                            value={variationLevel}
                            onChange={(e) => setVariationLevel(parseInt(e.target.value))}
                            className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <div className="flex justify-between text-[8px] text-muted-foreground mt-1 px-1">
                            <span>Sama (0%)</span>
                            <span>Beda (80%)</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                        <span className="text-sm font-medium">Total: <b className="text-blue-500">{files.length}</b> Gambar</span>
                        {files.length > 0 && (
                            <Button onClick={handleStartProcess} disabled={isProcessing} className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg text-white font-semibold px-6 transition-all active:scale-95">
                                {isProcessing ? (
                                    <span className="flex items-center gap-2">Memproses... <span className="animate-spin inline-block rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></span></span>
                                ) : (
                                    <><Play className="fill-white h-4 w-4" /> Start Process</>
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Dropzone Area */}
            {files.length === 0 && (
                <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-2xl p-16 text-center transition-all cursor-pointer overflow-hidden relative group ${isDragActive
                        ? "border-blue-500 bg-blue-500/5"
                        : "border-border/60 bg-card/20 hover:border-blue-500/50 hover:bg-card/40"
                        }`}
                >
                    <input {...getInputProps()} />
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                    <div className="flex flex-col items-center justify-center relative z-10 min-h-[180px]">
                        <div className={`h-20 w-20 rounded-2xl flex items-center justify-center mb-5 transition-all duration-300 shadow-sm ${isDragActive ? 'scale-110 bg-blue-500 text-white rotate-6' : 'bg-muted/50 text-muted-foreground group-hover:scale-105 group-hover:bg-blue-500/20 group-hover:text-blue-500'}`}>
                            <UploadCloud className="h-10 w-10" />
                        </div>
                        {isDragActive ? (
                            <p className="text-xl font-bold text-blue-500 animate-pulse">Lepaskan gambar di sini...</p>
                        ) : (
                            <>
                                <h3 className="text-2xl font-bold text-foreground mb-2 group-hover:text-blue-500 transition-colors">Pilih atau Tarik Gambar Ke Sini</h3>
                                <p className="text-sm text-muted-foreground mb-8 max-w-sm mx-auto">Sistem akan menganalisis gambar dan membuat prompt unik untuk menghindari copyright.</p>
                                <Button variant="outline" className="z-10 bg-background/50 backdrop-blur-md border-border/50 hover:bg-background hover:border-blue-500 transition-all px-8 py-6 rounded-xl">Pilih Files</Button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Export / Quick Copy Box */}
            {doneCount > 0 && !isProcessing && (
                <div className="flex flex-col gap-4 animate-in slide-in-from-top-4 duration-500">
                    <div className="flex justify-between items-center bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl backdrop-blur-sm">
                        <span className="text-blue-500 font-bold flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5" /> Selesai generating prompt {doneCount} gambar.
                        </span>
                        <div className="flex gap-3">
                            <Button onClick={handleCopyAll} variant="outline" className="border-blue-500/30 text-blue-500 hover:bg-blue-500 hover:text-white gap-2">
                                <FileText className="h-4 w-4" /> Copy All Results
                            </Button>
                            <Button onClick={handleExportTXT} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-md">
                                <Download className="h-4 w-4" /> Download TXT
                            </Button>
                        </div>
                    </div>

                    {/* Quick Copy Box Content */}
                    <div className="bg-card/50 border border-border/50 rounded-xl p-5 shadow-inner">
                        <h5 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                            <FileText className="h-3 w-3" /> Quick Copy Format
                        </h5>
                        <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            <div className="bg-black/20 dark:bg-black/40 p-4 rounded-lg font-mono text-[13px] text-foreground/80 whitespace-pre-wrap leading-relaxed select-all border border-border/30">
                                {files.filter(f => f.status === "done" && f.prompt).map((f, i) => (
                                    <div key={f.id} className="mb-6 last:mb-0">
                                        <div>{f.prompt}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-3 italic text-center">Format ini sudah disesuaikan untuk di-copy langsung ke kolom generator AI.</p>
                    </div>
                </div>
            )}

            {/* Data Table / Preview List */}
            {files.length > 0 && (
                <div className="rounded-2xl border border-border/40 bg-card overflow-hidden shadow-2xl backdrop-blur-sm animate-in fade-in duration-700">
                    <div className="border-b border-border/40 bg-muted/30 px-6 py-5 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg text-foreground">Hasil Pemrosesan</h3>
                            <span className="bg-muted px-2 py-0.5 rounded text-[10px] text-muted-foreground uppercase font-black">{files.length} ITEMS</span>
                        </div>
                        <div className="flex items-center gap-6">
                            <button
                                {...getRootProps()}
                                className="text-sm font-bold text-blue-500 hover:text-blue-600 flex items-center gap-1.5 transition-colors"
                            >
                                <input {...getInputProps()} />
                                <div className="p-1 bg-blue-500/10 rounded-md">
                                    <UploadCloud className="h-4 w-4" />
                                </div>
                                Tambah Gambar
                            </button>
                            <button
                                onClick={handleClearAll}
                                disabled={isProcessing}
                                className="text-sm font-bold text-destructive hover:text-red-600 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                            >
                                <XCircle className="h-4 w-4" />
                                Hapus Semua
                            </button>
                        </div>
                    </div>

                    <div className="divide-y divide-border/30 max-h-[700px] overflow-y-auto custom-scrollbar">
                        {files.map((item) => (
                            <div key={item.id} className={`p-6 flex flex-col sm:flex-row gap-6 transition-all duration-300 ${item.status === 'done' ? 'bg-blue-500/[0.03]' : 'hover:bg-muted/30'}`}>

                                {/* Thumbnail */}
                                <div className="relative shrink-0 w-36 h-36 rounded-xl border border-border/50 overflow-hidden bg-muted shadow-sm group/img">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={item.preview} className="object-cover w-full h-full transition-transform duration-500 group-hover/img:scale-110" alt="thumbnail" />
                                    <button onClick={() => handleRemoveItem(item.id)} className="absolute top-2 right-2 p-1.5 bg-black/70 rounded-full text-white hover:bg-destructive transition-all scale-0 group-hover/img:scale-100 backdrop-blur-md">
                                        <XCircle className="h-4 w-4" />
                                    </button>
                                    {item.status === 'done' && (
                                        <div className="absolute inset-0 border-4 border-blue-500/30 rounded-xl pointer-events-none"></div>
                                    )}
                                    <div className="absolute bottom-1 right-1 bg-black/50 text-[8px] text-white px-1.5 py-0.5 rounded backdrop-blur-sm">
                                        {(item.file.size / 1024 / 1024).toFixed(1)}MB
                                    </div>
                                </div>

                                {/* Metadata Detail */}
                                <div className="flex-1 flex flex-col gap-3 min-w-0">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <span className="font-bold text-sm text-foreground truncate max-w-[250px]" title={item.file.name}>{item.file.name}</span>

                                        {/* Status Badges */}
                                        {item.status === 'idle' && <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground px-2 py-0.5 rounded-full bg-muted border border-border/50">Menunggu</span>}
                                        {item.status === 'compressing' && <span className="text-[10px] font-black uppercase tracking-tighter text-blue-400 px-2 py-0.5 rounded-full bg-blue-400/10 border border-blue-400/20 animate-pulse">Compressing...</span>}
                                        {item.status === 'processing' && <span className="text-[10px] font-black uppercase tracking-tighter text-primary px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 flex items-center gap-1.5"><span className="animate-spin h-2.5 w-2.5 border-2 border-primary border-t-transparent rounded-full"></span> AI Generating</span>}
                                        {item.status === 'done' && <span className="text-[10px] font-black uppercase tracking-tighter text-blue-500 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" /> Sukses</span>}
                                        {item.status === 'failed' && <span className="text-[10px] font-black uppercase tracking-tighter text-destructive px-2 py-0.5 rounded-full bg-destructive/10 border border-destructive/20 flex items-center gap-1.5" title={item.error}><AlertCircle className="h-3 w-3" /> Error</span>}
                                    </div>

                                    {/* Result View or Editable form */}
                                    {item.prompt && (
                                        <div className="relative group/edit flex-1">
                                            {!item.isEditing ? (
                                                <div className="flex flex-col gap-2 pr-12 relative">
                                                    <div className="p-4 bg-background/50 border border-border/50 rounded-xl text-[13px] text-foreground/90 leading-relaxed font-mono shadow-inner group-hover/edit:border-blue-500/30 transition-all">
                                                        <FileText className="h-4 w-4 inline-block mr-3 text-blue-500/50" />
                                                        {item.prompt}
                                                    </div>
                                                    <button onClick={() => toggleEdit(item.id)} className="absolute top-3 right-3 p-2 bg-muted/50 rounded-lg text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-all opacity-0 group-hover/edit:opacity-100 shadow-sm border border-border/50">
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-3 bg-background/80 p-5 rounded-xl border-2 border-blue-500/30 shadow-2xl animate-in zoom-in-95 duration-200">
                                                    <div className="flex flex-col gap-1.5">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Manual Edit Prompt</label>
                                                        <textarea
                                                            value={item.prompt}
                                                            onChange={(e) => updatePrompt(item.id, e.target.value)}
                                                            className="min-h-[140px] w-full rounded-lg border border-border bg-background px-4 py-3 text-sm font-mono ring-offset-background focus-visible:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 shadow-inner"
                                                            placeholder="Tulis prompt di sini..."
                                                        />
                                                    </div>
                                                    <div className="flex justify-end gap-2 mt-1">
                                                        <Button size="sm" variant="ghost" onClick={() => toggleEdit(item.id)} className="h-8 text-xs font-bold text-muted-foreground hover:bg-muted">
                                                            Batal
                                                        </Button>
                                                        <Button size="sm" onClick={() => toggleEdit(item.id)} className="h-8 text-xs font-bold gap-1.5 bg-blue-500 hover:bg-blue-600 text-white shadow-md transition-all active:scale-95 px-4">
                                                            <Save className="h-3.5 w-3.5" /> Simpan Perubahan
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Error State */}
                                    {item.status === 'failed' && item.error && (
                                        <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-xl text-sm text-destructive font-medium flex items-center gap-3">
                                            <AlertCircle className="h-5 w-5" />
                                            {item.error}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
