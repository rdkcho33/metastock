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
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-[#18181b] p-5 border border-[#27272a] rounded-xl shadow-2xl">
                <div className="flex items-center gap-4">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 shadow-inner">
                        <Settings className="h-5 w-5" />
                    </span>
                    <div>
                        <h4 className="font-bold text-base text-zinc-100">Prompt AI Variation Settings</h4>
                        <p className="text-xs text-zinc-400 font-medium">Sesuaikan seberapa mirip hasil dengan foto asli</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6 w-full md:w-auto">
                    {/* Variation Slider */}
                    <div className="flex flex-col gap-1 w-full sm:w-48">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Originality Change</span>
                            <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">{variationLevel}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="80"
                            step="10"
                            value={variationLevel}
                            onChange={(e) => setVariationLevel(parseInt(e.target.value))}
                            className="w-full h-1.5 bg-[#27272a] rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <div className="flex justify-between text-[8px] font-bold text-zinc-500 mt-1 px-1">
                            <span>Sama (0%)</span>
                            <span>Beda (80%)</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                        <span className="text-sm font-semibold text-zinc-300">Total: <b className="text-blue-400">{files.length}</b> Gambar</span>
                        {files.length > 0 && (
                            <Button onClick={handleStartProcess} disabled={isProcessing} className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-lg text-white font-bold px-6 py-5 rounded-xl transition-all active:scale-95 border-b-4 border-blue-800">
                                {isProcessing ? (
                                    <span className="flex items-center gap-2">Memproses... <span className="animate-spin inline-block rounded-full h-3 w-3 border-2 border-white/20 border-t-white"></span></span>
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
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-[#27272a] bg-[#18181b] hover:border-blue-500/50 hover:bg-[#1c1c21]"
                        }`}
                >
                    <input {...getInputProps()} />

                    <div className="flex flex-col items-center justify-center relative z-10 min-h-[180px]">
                        <div className={`h-24 w-24 rounded-3xl flex items-center justify-center mb-6 transition-all duration-300 shadow-2xl ${isDragActive ? 'scale-110 bg-blue-500 text-white rotate-6' : 'bg-zinc-800 text-zinc-400 group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white'}`}>
                            <UploadCloud className="h-12 w-12" />
                        </div>
                        {isDragActive ? (
                            <p className="text-2xl font-black text-blue-400 animate-pulse">Lepaskan gambar di sini...</p>
                        ) : (
                            <>
                                <h3 className="text-2xl font-black text-zinc-100 mb-3 group-hover:text-blue-400 transition-colors uppercase tracking-tight">Tarik & Lepas Gambar</h3>
                                <p className="text-sm text-zinc-400 mb-10 max-w-sm mx-auto font-medium">Sistem akan menganalisis gambar dan membuat prompt unik untuk menghindari copyright.</p>
                                <Button variant="outline" className="z-10 bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700 hover:border-blue-500 transition-all px-10 py-6 rounded-xl font-bold uppercase tracking-widest text-xs">Pilih Files</Button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Export / Quick Copy Box */}
            {doneCount > 0 && !isProcessing && (
                <div className="flex flex-col gap-4 animate-in slide-in-from-top-4 duration-500">
                    <div className="flex justify-between items-center bg-blue-500/10 border border-blue-500/30 p-5 rounded-2xl">
                        <span className="text-blue-400 font-black flex items-center gap-3 text-sm italic uppercase tracking-wider">
                            <CheckCircle2 className="h-6 w-6" /> Selesai generating prompt {doneCount} gambar.
                        </span>
                        <div className="flex gap-4">
                            <Button onClick={handleCopyAll} variant="outline" className="bg-[#18181b] border-blue-500/40 text-blue-400 hover:bg-blue-500 hover:text-white gap-2 font-bold px-5 rounded-xl">
                                <FileText className="h-4 w-4" /> Copy All Results
                            </Button>
                            <Button onClick={handleExportTXT} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-lg font-bold px-6 rounded-xl border-b-4 border-blue-800">
                                <Download className="h-4 w-4" /> Download TXT
                            </Button>
                        </div>
                    </div>

                    {/* Quick Copy Box Content */}
                    <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-6 shadow-2xl">
                        <h5 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-4 flex items-center gap-3">
                            <div className="h-1 w-12 bg-blue-500 rounded-full"></div>
                            Quick Copy Format
                        </h5>
                        <div className="max-h-[300px] overflow-y-auto pr-3 custom-scrollbar">
                            <div className="bg-[#09090b] p-6 rounded-xl font-mono text-[13px] text-zinc-200 whitespace-pre-wrap leading-relaxed select-all border border-[#27272a] shadow-inner">
                                {files.filter(f => f.status === "done" && f.prompt).map((f, i) => (
                                    <div key={f.id} className="mb-8 last:mb-0 border-l-2 border-blue-500/30 pl-5">
                                        <div className="text-[10px] text-zinc-600 mb-2 font-black uppercase tracking-tighter"># Prompt {i + 1}</div>
                                        <div>{f.prompt}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-4 italic text-center font-medium">Format ini sudah disesuaikan untuk di-copy langsung ke kolom generator AI.</p>
                    </div>
                </div>
            )}

            {/* Data Table / Preview List */}
            {files.length > 0 && (
                <div className="rounded-2xl border border-border/40 bg-card overflow-hidden shadow-2xl backdrop-blur-sm animate-in fade-in duration-700">
                    <div className="border-b border-[#27272a] bg-[#1c1c21] px-6 py-6 flex justify-between items-center shadow-lg">
                        <div className="flex items-center gap-3">
                            <h3 className="font-black text-xl text-zinc-100 tracking-tight uppercase">Hasil Pemrosesan</h3>
                            <span className="bg-blue-500 text-white px-2.5 py-0.5 rounded-full text-[10px] uppercase font-black tracking-widest">{files.length} ITEMS</span>
                        </div>
                        <div className="flex items-center gap-8">
                            <button
                                {...getRootProps()}
                                className="text-sm font-black text-blue-400 hover:text-blue-300 flex items-center gap-2 transition-all active:scale-95 group/btn"
                            >
                                <input {...getInputProps()} />
                                <div className="p-2 bg-blue-500/10 rounded-xl group-hover/btn:bg-blue-500/20 transition-colors">
                                    <UploadCloud className="h-4 w-4" />
                                </div>
                                TAMBAH GAMBAR
                            </button>
                            <button
                                onClick={handleClearAll}
                                disabled={isProcessing}
                                className="text-sm font-black text-red-500 hover:text-red-400 disabled:opacity-50 transition-all active:scale-95 flex items-center gap-2 group/del"
                            >
                                <div className="p-2 bg-red-500/10 rounded-xl group-hover/del:bg-red-500/20 transition-colors">
                                    <XCircle className="h-4 w-4" />
                                </div>
                                HAPUS SEMUA
                            </button>
                        </div>
                    </div>

                    <div className="divide-y divide-border/30 max-h-[700px] overflow-y-auto custom-scrollbar">
                        {files.map((item) => (
                            <div key={item.id} className={`p-8 flex flex-col sm:flex-row gap-8 transition-all duration-300 border-b border-[#27272a]/40 ${item.status === 'done' ? 'bg-[#1c1c21]/50' : 'hover:bg-[#1c1c21]/30'}`}>

                                {/* Thumbnail */}
                                <div className="relative shrink-0 w-44 h-44 rounded-2xl border border-[#27272a] overflow-hidden bg-[#09090b] shadow-2xl group/img">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={item.preview} className="object-cover w-full h-full transition-transform duration-700 group-hover/img:scale-110 opacity-90 group-hover/img:opacity-100" alt="thumbnail" />
                                    <button onClick={() => handleRemoveItem(item.id)} className="absolute top-3 right-3 p-2 bg-red-600/90 rounded-xl text-white hover:bg-red-500 transition-all scale-0 group-hover/img:scale-100 backdrop-blur-md shadow-lg">
                                        <XCircle className="h-5 w-5" />
                                    </button>
                                    <div className="absolute bottom-2 right-2 bg-black/70 text-[10px] font-black text-white px-2 py-1 rounded-lg backdrop-blur-md border border-white/10">
                                        {(item.file.size / 1024 / 1024).toFixed(1)}MB
                                    </div>
                                    {item.status === 'done' && (
                                        <div className="absolute top-3 left-3 bg-blue-600 text-white p-1.5 rounded-lg shadow-lg">
                                            <CheckCircle2 className="h-4 w-4" />
                                        </div>
                                    )}
                                </div>

                                {/* Metadata Detail */}
                                <div className="flex-1 flex flex-col gap-4 min-w-0">
                                    <div className="flex flex-wrap items-center gap-4">
                                        <span className="font-black text-base text-zinc-100 truncate max-w-[350px] tracking-tight uppercase" title={item.file.name}>{item.file.name}</span>

                                        {/* Status Badges */}
                                        {item.status === 'idle' && <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-3 py-1 rounded-lg bg-zinc-800 border border-[#27272a]">MENUNGGU</span>}
                                        {item.status === 'compressing' && <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 px-3 py-1 rounded-lg bg-blue-400/10 border border-blue-400/20 animate-pulse">COMPRESSING...</span>}
                                        {item.status === 'processing' && <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center gap-2"><span className="animate-spin h-3 w-3 border-2 border-blue-500 border-t-transparent rounded-full"></span> AI GENERATING</span>}
                                        {item.status === 'done' && <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 px-3 py-1 rounded-lg bg-emerald-400/10 border border-emerald-400/20 flex items-center gap-2"><CheckCircle2 className="h-3 w-3" /> SUKSES</span>}
                                        {item.status === 'failed' && <span className="text-[10px] font-black uppercase tracking-widest text-red-500 px-3 py-1 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2" title={item.error}><AlertCircle className="h-3 w-3" /> ERROR</span>}
                                    </div>

                                    {/* Result View or Editable form */}
                                    {item.prompt && (
                                        <div className="relative group/edit flex-1">
                                            {!item.isEditing ? (
                                                <div className="relative">
                                                    <div
                                                        className={[
                                                            "relative overflow-hidden rounded-2xl border",
                                                            "border-border/60 group-hover:border-blue-500/30",
                                                            "bg-gradient-to-b from-background/80 to-background/40",
                                                            "dark:from-background/40 dark:to-background/20",
                                                            "shadow-inner",
                                                            "transition-all",
                                                        ].join(" ")}
                                                    >
                                                        {/* Header mini */}
                                                        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/20">
                                                            <div className="flex items-center gap-2">
                                                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                                                                    <FileText className="h-4 w-4" />
                                                                </span>
                                                                <div className="leading-tight">
                                                                    <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                                                                        Generated Prompt
                                                                    </p>
                                                                    <p className="text-[11px] text-muted-foreground/80">
                                                                        Klik icon pensil untuk edit
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {/* Actions */}
                                                            <button
                                                                onClick={() => toggleEdit(item.id)}
                                                                className={[
                                                                    "inline-flex items-center gap-2",
                                                                    "px-3 py-1.5 rounded-xl",
                                                                    "text-[12px] font-bold",
                                                                    "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                                                                    "border border-blue-500/20",
                                                                    "hover:bg-blue-500/15 hover:border-blue-500/30",
                                                                    "transition-all",
                                                                ].join(" ")}
                                                            >
                                                                <Edit2 className="h-4 w-4" />
                                                                Edit
                                                            </button>
                                                        </div>

                                                        {/* Body prompt */}
                                                        <div className="px-4 py-4">
                                                            <div
                                                                className={[
                                                                    "font-mono text-[13px] leading-relaxed whitespace-pre-wrap",
                                                                    "text-foreground",
                                                                    "selection:bg-blue-500/20",
                                                                ].join(" ")}
                                                            >
                                                                {item.prompt}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-4 bg-[#09090b] p-6 rounded-2xl border-2 border-blue-600/30 shadow-2xl animate-in zoom-in-95 duration-200">
                                                    <div className="flex flex-col gap-2">
                                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 flex items-center gap-2">
                                                            <div className="h-1 w-8 bg-blue-500 rounded-full"></div>
                                                            Manual Edit Prompt
                                                        </label>
                                                        <textarea
                                                            value={item.prompt}
                                                            onChange={(e) => updatePrompt(item.id, e.target.value)}
                                                            className="min-h-[160px] w-full rounded-xl border border-[#27272a] bg-[#13131a] px-5 py-4 text-sm font-mono text-zinc-100 ring-offset-[#09090b] focus-visible:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 shadow-inner leading-relaxed"
                                                            placeholder="Tulis prompt di sini..."
                                                        />
                                                    </div>
                                                    <div className="flex justify-end gap-3 mt-1">
                                                        <Button size="sm" variant="ghost" onClick={() => toggleEdit(item.id)} className="h-10 text-xs font-black uppercase tracking-widest text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100">
                                                            BATAL
                                                        </Button>
                                                        <Button size="sm" onClick={() => toggleEdit(item.id)} className="h-10 text-xs font-black uppercase tracking-widest gap-2 bg-blue-600 hover:bg-blue-500 text-white shadow-lg transition-all active:scale-95 px-6 rounded-xl border-b-4 border-blue-800">
                                                            <Save className="h-4 w-4" /> SIMPAN PERUBAHAN
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Error State */}
                                    {item.status === 'failed' && item.error && (
                                        <div className="p-5 bg-red-500/10 border border-red-500/20 rounded-2xl text-sm text-red-400 font-bold flex items-center gap-4 shadow-lg animate-in shake duration-500">
                                            <AlertCircle className="h-6 w-6" />
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
