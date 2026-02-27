"use client";

import { useCallback, useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, XCircle, Settings, Play, CheckCircle2, AlertCircle, Edit2, Save, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resizeImageFile } from "@/lib/image-helper";
import { GeminiService } from "@/lib/gemini-service";
import { GroqService } from "@/lib/groq-service";

import { markKeyExhausted } from "@/app/dashboard/keys/actions";

export interface ProcessingFile {
    id: string;
    file: File;
    preview: string;
    status: "idle" | "compressing" | "processing" | "done" | "failed";
    result?: {
        title: string;
        keywords: string;
        category: string;
    };
    error?: string;
    isEditing?: boolean;
}

export function ImageDropzone({
    initialApiKeys = []
}: {
    initialApiKeys?: { id: string, key: string, status: string, provider: string }[]
}) {
    const [files, setFiles] = useState<ProcessingFile[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [apiKeys, setApiKeys] = useState(initialApiKeys);

    // New Settings
    const [titleLength, setTitleLength] = useState(100);
    const [keywordCount, setKeywordCount] = useState(50);

    // Sinkronisasi Prop Update
    useEffect(() => {
        setApiKeys(initialApiKeys);
    }, [initialApiKeys]);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const newFiles: ProcessingFile[] = acceptedFiles.map((file) => ({
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
        fileObj: ProcessingFile,
        currentKeyObj: { key: string, provider: string }
    ) => {
        try {
            setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: "compressing" } : f));
            const base64Data = await resizeImageFile(fileObj.file, 1024);
            setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: "processing" } : f));

            let response;
            if (currentKeyObj.provider === "groq") {
                response = await GroqService.generateMetadata(currentKeyObj.key, base64Data, titleLength, keywordCount);
            } else {
                response = await GeminiService.generateMetadata(currentKeyObj.key, base64Data, titleLength, keywordCount);
            }

            setFiles(prev => prev.map(f => f.id === fileObj.id ? {
                ...f,
                status: "done",
                result: response
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

        // Get all active keys
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

            // Try available keys until success or all exhausted
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
                        alert("Semua API Key telah mencapai limit (429)! Silakan tambahkan API Key baru.");
                        setIsProcessing(false);
                        return;
                    }
                } else {
                    // Other error (not quota), move to next file
                    attemptSuccessful = true; // Mark as "tried" so we don't loop forever on a broken file
                }
            }

            // Jeda antar gambar
            await new Promise(r => setTimeout(r, 1000));
        }

        setIsProcessing(false);
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

    const updateResult = (id: string, field: 'title' | 'keywords' | 'category', value: string) => {
        setFiles(prev => prev.map(f => {
            if (f.id === id && f.result) {
                return { ...f, result: { ...f.result, [field]: value } };
            }
            return f;
        }));
    };

    // CSV Export Logic (Fix Vertical Order & Header)
    const handleExportCSV = () => {
        const doneFiles = files.filter(f => f.status === "done" && f.result);
        if (doneFiles.length === 0) return;

        const headers = ["Filename", "Title", "Keywords", "Category"];
        const escapeCSV = (str: string) => `"${str.replace(/"/g, '""')}"`;

        const rows = doneFiles.map(f => {
            const title = escapeCSV(f.result!.title);
            const keywords = escapeCSV(f.result!.keywords);
            return `${f.file.name},${title},${keywords},${f.result!.category}`;
        });

        // Use literal newline \n and BOM for Excel compatibility
        const csvContent = "\uFEFF" + headers.join(",") + "\n" + rows.join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);

        link.setAttribute("href", url);
        link.setAttribute("download", "metadata_adobestock.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const doneCount = files.filter(f => f.status === "done").length;

    // Helper to get bubble color based on keyword relevance
    const getKeywordBadgeStyle = (index: number) => {
        if (index < 10) return "bg-blue-500 text-white shadow-sm border-blue-400";
        if (index < 20) return "bg-indigo-500/80 text-white border-indigo-400/50";
        if (index < 30) return "bg-slate-500 text-white border-slate-400/50";
        return "bg-muted text-muted-foreground border-border";
    };

    return (
        <div className="flex flex-col gap-6 w-full mt-2">
            {/* Settings Row (Sliders) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-card/80 p-6 border border-border/50 rounded-2xl backdrop-blur-md shadow-xl overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none"></div>

                {/* Title Length Slider */}
                <div className="flex flex-col gap-2 relative z-10">
                    <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-blue-500/10 rounded-lg">
                                <Settings className="h-4 w-4 text-blue-500" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-widest text-foreground">Title Length</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full">{titleLength} Chars</span>
                    </div>
                    <input
                        type="range" min="50" max="200" step="10"
                        value={titleLength}
                        onChange={(e) => setTitleLength(parseInt(e.target.value))}
                        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground px-1 mt-1 font-medium">
                        <span>Min (50)</span>
                        <span>Max (200)</span>
                    </div>
                </div>

                {/* Keyword Count Slider */}
                <div className="flex flex-col gap-2 relative z-10">
                    <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-indigo-500/10 rounded-lg">
                                <Settings className="h-4 w-4 text-indigo-500" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-widest text-foreground">Keywords Count</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-full">{keywordCount} Tags</span>
                    </div>
                    <input
                        type="range" min="10" max="50" step="5"
                        value={keywordCount}
                        onChange={(e) => setKeywordCount(parseInt(e.target.value))}
                        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground px-1 mt-1 font-medium">
                        <span>Min (10)</span>
                        <span>Max (50)</span>
                    </div>
                </div>

                {/* Process Button Area */}
                <div className="flex items-center justify-end gap-6 relative z-10 lg:border-l lg:border-border/30 lg:pl-6">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Queue Status</span>
                        <span className="text-sm font-bold text-foreground">{files.length} <span className="font-normal opacity-60">Items Loaded</span></span>
                    </div>
                    {files.length > 0 && (
                        <Button
                            onClick={handleStartProcess}
                            disabled={isProcessing}
                            className="h-12 gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg text-white font-bold px-8 transition-all active:scale-95"
                        >
                            {isProcessing ? (
                                <><span className="animate-spin h-5 w-5 border-3 border-white/30 border-t-white rounded-full"></span> Memproses...</>
                            ) : (
                                <><Play className="fill-white h-5 w-5" /> Start Process</>
                            )}
                        </Button>
                    )}
                </div>
            </div>

            {/* Main Dropzone Area */}
            {files.length === 0 && (
                <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-3xl p-16 text-center transition-all cursor-pointer overflow-hidden relative group h-[300px] flex items-center justify-center ${isDragActive
                        ? "border-blue-500 bg-blue-500/5"
                        : "border-border/60 bg-card/20 hover:border-blue-500/40 hover:bg-card/40"
                        }`}
                >
                    <input {...getInputProps()} />
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                    <div className="flex flex-col items-center justify-center relative z-10">
                        <div className={`h-24 w-24 rounded-3xl flex items-center justify-center mb-6 transition-all duration-500 shadow-sm ${isDragActive ? 'scale-110 bg-blue-500 text-white rotate-6' : 'bg-muted/50 text-muted-foreground group-hover:scale-105 group-hover:bg-blue-500/20 group-hover:text-blue-500'}`}>
                            <UploadCloud className="h-12 w-12" />
                        </div>
                        {isDragActive ? (
                            <p className="text-xl font-bold text-blue-500 animate-pulse">Lepaskan gambar di sini...</p>
                        ) : (
                            <>
                                <h3 className="text-3xl font-bold text-foreground mb-3 tracking-tight group-hover:text-blue-500 transition-colors">Pilih atau Tarik Gambar</h3>
                                <p className="text-sm text-muted-foreground mb-10 max-w-md mx-auto leading-relaxed">System AI akan menganalisis visual dan menghasilkan metadata SEO-friendly untuk Adobe Stock dalam hitungan detik.</p>
                                <Button variant="outline" className="z-10 bg-background/50 backdrop-blur-md border-border/50 hover:bg-background hover:border-blue-500 transition-all px-10 py-7 text-base font-bold rounded-2xl">Buka File Explorer</Button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Export Summary Bar */}
            {doneCount > 0 && !isProcessing && (
                <div className="flex justify-between items-center bg-blue-500/10 border border-blue-500/20 p-5 rounded-2xl backdrop-blur-sm animate-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                            <CheckCircle2 className="h-6 w-6 text-blue-500" />
                        </div>
                        <div>
                            <h4 className="font-bold text-blue-500">Metadata Extraction Success</h4>
                            <p className="text-xs text-blue-500/70">Sudah memproses total {doneCount} gambar.</p>
                        </div>
                    </div>
                    <Button onClick={handleExportCSV} className="bg-blue-600 hover:bg-blue-700 text-white gap-3 px-8 py-6 rounded-xl font-bold font-lg shadow-xl transition-all active:scale-95">
                        <Download className="h-5 w-5" /> Download CSV Standar Adobe Stock
                    </Button>
                </div>
            )}

            {/* Data Table / Preview List */}
            {files.length > 0 && (
                <div className="rounded-2xl border border-border/40 bg-card overflow-hidden shadow-2xl backdrop-blur-md animate-in fade-in duration-700">
                    <div className="border-b border-border/40 bg-muted/30 px-6 py-5 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <h3 className="font-bold text-xl text-foreground">Daftar Pemrosesan</h3>
                            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase border border-primary/20">{files.length} ITEMS</span>
                        </div>
                        <div className="flex items-center gap-8">
                            <button
                                {...getRootProps()}
                                className="text-sm font-bold text-blue-500 hover:text-blue-600 flex items-center gap-2 transition-all hover:translate-y-[-1px]"
                            >
                                <input {...getInputProps()} />
                                <div className="p-1.5 bg-blue-500/10 rounded-lg">
                                    <UploadCloud className="h-4 w-4" />
                                </div>
                                Tambah File
                            </button>
                            <button
                                onClick={handleClearAll}
                                disabled={isProcessing}
                                className="text-sm font-bold text-destructive hover:text-red-500 disabled:opacity-50 transition-all flex items-center gap-2 hover:translate-y-[-1px]"
                            >
                                <XCircle className="h-4 w-4" />
                                Kosongkan List
                            </button>
                        </div>
                    </div>

                    <div className="divide-y divide-border/30 max-h-[800px] overflow-y-auto custom-scrollbar">
                        {files.map((item) => (
                            <div key={item.id} className={`p-6 flex flex-col sm:flex-row gap-8 transition-all duration-300 ${item.status === 'done' ? 'bg-blue-500/[0.03]' : 'hover:bg-muted/30'}`}>

                                {/* Thumbnail */}
                                <div className="relative shrink-0 w-32 h-32 rounded-2xl border border-border/50 overflow-hidden bg-muted shadow-lg group/img">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={item.preview} className="object-cover w-full h-full transition-transform duration-500 group-hover/img:scale-110" alt="thumbnail" />
                                    <button onClick={() => handleRemoveItem(item.id)} className="absolute top-2 right-2 p-1.5 bg-black/70 rounded-full text-white hover:bg-destructive transition-all scale-0 group-hover/img:scale-100 backdrop-blur-md">
                                        <XCircle className="h-4 w-4" />
                                    </button>
                                    {item.status === 'done' && (
                                        <div className="absolute inset-0 border-4 border-blue-500/30 rounded-2xl pointer-events-none"></div>
                                    )}
                                    <div className="absolute bottom-2 right-2 bg-black/60 text-[10px] font-bold text-white px-2 py-1 rounded-lg backdrop-blur-sm shadow-sm">
                                        {(item.file.size / 1024 / 1024).toFixed(1)}MB
                                    </div>
                                </div>

                                {/* Metadata Detail */}
                                <div className="flex-1 flex flex-col gap-4 min-w-0">
                                    <div className="flex flex-wrap items-center gap-4">
                                        <span className="font-bold text-base text-foreground truncate max-w-[300px]" title={item.file.name}>{item.file.name}</span>

                                        {/* Status Badges */}
                                        {item.status === 'idle' && <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-3 py-1 rounded-full bg-muted border border-border/50">Menunggu</span>}
                                        {item.status === 'compressing' && <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 px-3 py-1 rounded-full bg-blue-400/10 border border-blue-400/20 animate-pulse">Compressing...</span>}
                                        {item.status === 'processing' && <span className="text-[10px] font-black uppercase tracking-widest text-primary px-3 py-1 rounded-full bg-primary/10 border border-primary/20 flex items-center gap-2"><span className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full"></span> AI Extracting</span>}
                                        {item.status === 'done' && <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5" /> Sukses</span>}
                                        {item.status === 'failed' && <span className="text-[10px] font-black uppercase tracking-widest text-destructive px-3 py-1 rounded-full bg-destructive/10 border border-destructive/20 flex items-center gap-2" title={item.error}><AlertCircle className="h-3.5 w-3.5" /> Gagal</span>}
                                    </div>

                                    {/* Result View or Editable form */}
                                    {item.result && (
                                        <div className="relative group/edit">
                                            {!item.isEditing ? (
                                                <div className="flex flex-col gap-4 pr-14 relative bg-background/40 p-5 rounded-2xl border border-border/40 group-hover/edit:border-blue-500/30 transition-all shadow-inner">
                                                    <div className="flex flex-col gap-1.5">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Adobe Stock Title</span>
                                                        <h4 className="text-lg font-bold text-foreground leading-snug" title={item.result.title}>{item.result.title}</h4>
                                                    </div>

                                                    <div className="flex flex-col gap-2">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">SEO Keywords Bubble (Relatable Order)</span>
                                                        <div className="flex flex-wrap gap-2">
                                                            {item.result.keywords.split(',').map((kw, i) => (
                                                                <span key={`${item.id}-kw-${i}`} className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all ${getKeywordBadgeStyle(i)}`}>
                                                                    {kw.trim()}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 mt-2">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Category:</span>
                                                        <span className="text-xs font-bold bg-primary/10 text-primary px-3 py-1 rounded-lg border border-primary/20 uppercase tracking-tighter">ID {item.result.category}</span>
                                                    </div>

                                                    <button onClick={() => toggleEdit(item.id)} className="absolute top-4 right-4 p-2.5 bg-muted/80 rounded-xl text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-all opacity-0 group-hover/edit:opacity-100 shadow-sm border border-border/50 backdrop-blur-md">
                                                        <Edit2 className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-5 bg-background/90 p-6 rounded-2xl border-2 border-blue-500/30 shadow-2xl animate-in zoom-in-95 duration-200">
                                                    <div className="flex flex-col gap-2">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Main Title</label>
                                                        <Input value={item.result.title} onChange={(e) => updateResult(item.id, 'title', e.target.value)} className="h-11 text-base font-bold bg-muted/30 focus-visible:ring-blue-500/30 border-border/60" />
                                                    </div>
                                                    <div className="flex flex-col gap-2">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Keywords (Comma Separated)</label>
                                                        <textarea
                                                            value={item.result.keywords}
                                                            onChange={(e) => updateResult(item.id, 'keywords', e.target.value)}
                                                            className="min-h-[120px] w-full rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm font-medium ring-offset-background focus-visible:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all shadow-inner leading-relaxed"
                                                        />
                                                    </div>
                                                    <div className="flex justify-end gap-3 pt-2">
                                                        <Button size="sm" variant="ghost" onClick={() => toggleEdit(item.id)} className="h-10 text-xs font-bold font-muted-foreground hover:bg-muted rounded-xl px-6">
                                                            Batal
                                                        </Button>
                                                        <Button size="sm" onClick={() => toggleEdit(item.id)} className="h-10 text-xs font-bold gap-2 bg-blue-500 hover:bg-blue-600 text-white shadow-lg transition-all active:scale-95 rounded-xl px-8">
                                                            <Save className="h-4 w-4" /> Simpan Perubahan
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Error State */}
                                    {item.status === 'failed' && item.error && (
                                        <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-2xl text-sm text-destructive font-bold flex items-center gap-3 shadow-inner">
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
