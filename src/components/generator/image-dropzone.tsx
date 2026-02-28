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
                        alert("Semua API Key yang aktif saat ini telah mencapai limit (429).\n\nTips: API gratis biasanya memiliki limit per menit. Silakan tunggu 1-2 menit, lalu klik 'Reset Semua Status' di menu Kelola API Keys untuk mencoba kembali.");
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-[#18181b] p-6 border border-[#27272a] rounded-2xl shadow-2xl relative group overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none"></div>

                {/* Title Length Slider */}
                <div className="flex flex-col gap-2 relative z-10">
                    <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-blue-500/15 rounded-xl border border-blue-500/20">
                                <Settings className="h-4 w-4 text-blue-400" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-100">Title Length</span>
                        </div>
                        <span className="text-[10px] font-mono font-black text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">{titleLength} Chars</span>
                    </div>
                    <input
                        type="range" min="50" max="200" step="10"
                        value={titleLength}
                        onChange={(e) => setTitleLength(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-[#27272a] rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <div className="flex justify-between text-[8px] text-zinc-500 px-1 mt-1 font-black uppercase tracking-tighter">
                        <span>Min (50)</span>
                        <span>Max (200)</span>
                    </div>
                </div>

                {/* Keyword Count Slider */}
                <div className="flex flex-col gap-2 relative z-10">
                    <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-indigo-500/15 rounded-xl border border-indigo-500/20">
                                <Settings className="h-4 w-4 text-indigo-400" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-100">Keywords Count</span>
                        </div>
                        <span className="text-[10px] font-mono font-black text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">{keywordCount} Tags</span>
                    </div>
                    <input
                        type="range" min="10" max="50" step="5"
                        value={keywordCount}
                        onChange={(e) => setKeywordCount(parseInt(e.target.value))}
                        className="w-full h-1.5 bg-[#27272a] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                    <div className="flex justify-between text-[8px] text-zinc-500 px-1 mt-1 font-black uppercase tracking-tighter">
                        <span>Min (10)</span>
                        <span>Max (50)</span>
                    </div>
                </div>

                {/* Process Button Area */}
                <div className="flex items-center justify-end gap-6 relative z-10 lg:border-l lg:border-[#27272a] lg:pl-6">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Queue Status</span>
                        <span className="text-sm font-black text-zinc-100 italic uppercase">{files.length} <span className="font-medium text-zinc-500 not-italic lowercase">Items Loaded</span></span>
                    </div>
                    {files.length > 0 && (
                        <Button
                            onClick={handleStartProcess}
                            disabled={isProcessing}
                            className="h-12 gap-3 bg-blue-600 hover:bg-blue-500 shadow-xl text-white font-black uppercase tracking-widest px-8 transition-all active:scale-95 rounded-xl border-b-4 border-blue-800"
                        >
                            {isProcessing ? (
                                <><span className="animate-spin h-4 w-4 border-2 border-white/20 border-t-white rounded-full"></span> Memproses...</>
                            ) : (
                                <><Play className="fill-white h-4 w-4" /> START</>
                            )}
                        </Button>
                    )}
                </div>
            </div>

            {/* Main Dropzone Area */}
            {files.length === 0 && (
                <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-3xl p-16 text-center transition-all cursor-pointer overflow-hidden relative group h-[340px] flex items-center justify-center ${isDragActive
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-[#27272a] bg-[#18181b] hover:border-blue-500/50 hover:bg-[#1c1c21]"
                        }`}
                >
                    <input {...getInputProps()} />

                    <div className="flex flex-col items-center justify-center relative z-10">
                        <div className={`h-28 w-28 rounded-3xl flex items-center justify-center mb-8 transition-all duration-500 shadow-2xl ${isDragActive ? 'scale-110 bg-blue-500 text-white rotate-6' : 'bg-zinc-800 text-zinc-400 group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white'}`}>
                            <UploadCloud className="h-14 w-14" />
                        </div>
                        {isDragActive ? (
                            <p className="text-2xl font-black text-blue-400 animate-pulse uppercase tracking-wider">Lepaskan gambar di sini...</p>
                        ) : (
                            <>
                                <h3 className="text-3xl font-black text-zinc-100 mb-4 tracking-tight group-hover:text-blue-400 transition-colors uppercase italic">Pilih atau Tarik Gambar</h3>
                                <p className="text-sm text-zinc-500 mb-10 max-w-md mx-auto leading-relaxed font-medium">System AI akan menganalisis visual dan menghasilkan metadata SEO-friendly untuk Adobe Stock dalam hitungan detik.</p>
                                <Button variant="outline" className="z-10 bg-zinc-800 border-zinc-700 text-zinc-100 hover:bg-zinc-700 hover:border-blue-500 transition-all px-12 py-8 text-xs font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl">Buka File Explorer</Button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Export Summary Bar */}
            {doneCount > 0 && !isProcessing && (
                <div className="flex justify-between items-center bg-blue-600/10 border border-blue-500/30 p-6 rounded-2xl shadow-xl animate-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-5">
                        <div className="h-14 w-14 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-500/30">
                            <CheckCircle2 className="h-7 w-7 text-blue-400" />
                        </div>
                        <div>
                            <h4 className="font-black text-blue-400 uppercase tracking-wider text-lg">Extraction Complete</h4>
                            <p className="text-xs text-blue-400/60 font-bold uppercase tracking-widest">Successfully processed {doneCount} images.</p>
                        </div>
                    </div>
                    <Button onClick={handleExportCSV} className="bg-blue-600 hover:bg-blue-500 text-white gap-3 px-10 py-7 rounded-xl font-black text-sm uppercase tracking-widest shadow-2xl transition-all active:scale-95 border-b-4 border-blue-800">
                        <Download className="h-5 w-5" /> Download Adobe Stock CSV
                    </Button>
                </div>
            )}

            {/* Data Table / Preview List */}
            {files.length > 0 && (
                <div className="rounded-2xl border border-[#27272a] bg-[#1c1c21] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in fade-in duration-700">
                    <div className="border-b border-[#27272a] bg-[#18181b] px-6 py-5 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <h3 className="font-black text-sm uppercase tracking-[0.2em] text-zinc-100">Processing Queue</h3>
                            <span className="bg-blue-600 text-white px-3 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase shadow-lg italic">{files.length} ITEMS</span>
                        </div>
                        <div className="flex items-center gap-8">
                            <button
                                {...getRootProps()}
                                className="text-[10px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-300 flex items-center gap-2 transition-all active:scale-95"
                            >
                                <input {...getInputProps()} />
                                <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                                    <UploadCloud className="h-4 w-4" />
                                </div>
                                Add Files
                            </button>
                            <button
                                onClick={handleClearAll}
                                disabled={isProcessing}
                                className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-red-400 disabled:opacity-30 transition-all flex items-center gap-2 active:scale-95"
                            >
                                <div className="p-2 bg-zinc-800 rounded-xl border border-zinc-700 group-hover:bg-red-500/10 group-hover:border-red-500/20">
                                    <XCircle className="h-4 w-4" />
                                </div>
                                Clear List
                            </button>
                        </div>
                    </div>

                    <div className="divide-y divide-[#27272a]/50 max-h-[800px] overflow-y-auto custom-scrollbar">
                        {files.map((item) => (
                            <div key={item.id} className={`p-6 flex flex-col sm:flex-row gap-8 transition-all duration-300 ${item.status === 'done' ? 'bg-blue-500/[0.04]' : 'hover:bg-[#18181b]'}`}>

                                {/* Thumbnail */}
                                <div className="relative shrink-0 w-32 h-32 rounded-2xl border border-[#27272a] overflow-hidden bg-[#0c0c0e] shadow-xl group/img">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={item.preview} className="object-cover w-full h-full transition-transform duration-700 group-hover/img:scale-110 opacity-80 group-hover/img:opacity-100" alt="thumbnail" />
                                    <button onClick={() => handleRemoveItem(item.id)} className="absolute top-2 right-2 p-2 bg-black/80 rounded-xl text-white hover:bg-red-500 transition-all scale-0 group-hover/img:scale-100 shadow-xl border border-white/10">
                                        <XCircle className="h-4 w-4" />
                                    </button>
                                    {item.status === 'done' && (
                                        <div className="absolute inset-0 border-4 border-blue-500/40 rounded-2xl pointer-events-none"></div>
                                    )}
                                    <div className="absolute bottom-2 right-2 bg-black/80 text-[10px] font-black text-white px-2.5 py-1.5 rounded-lg border border-white/10 shadow-lg">
                                        {(item.file.size / 1024 / 1024).toFixed(1)}MB
                                    </div>
                                </div>

                                {/* Metadata Detail */}
                                <div className="flex-1 flex flex-col gap-4 min-w-0">
                                    <div className="flex flex-wrap items-center gap-4">
                                        <span className="font-black text-base text-zinc-100 truncate max-w-[300px] uppercase tracking-tight" title={item.file.name}>{item.file.name}</span>

                                        {/* Status Badges */}
                                        {item.status === 'idle' && <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 px-3 py-1 rounded-lg bg-zinc-800 border border-zinc-700">QUEUED</span>}
                                        {item.status === 'compressing' && <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 px-3 py-1 rounded-lg bg-blue-400/10 border border-blue-400/20 animate-pulse">Compressing</span>}
                                        {item.status === 'processing' && <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 px-3 py-1 rounded-lg bg-indigo-400/10 border border-indigo-400/20 flex items-center gap-2"><span className="animate-spin h-3 w-3 border-2 border-indigo-400 border-t-transparent rounded-full"></span> AI Extracting</span>}
                                        {item.status === 'done' && <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 px-3 py-1 rounded-lg bg-emerald-400/10 border border-emerald-400/20 flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5" /> SUCCESS</span>}
                                        {item.status === 'failed' && <span className="text-[10px] font-black uppercase tracking-widest text-red-400 px-3 py-1 rounded-lg bg-red-400/10 border border-red-400/20 flex items-center gap-2" title={item.error}><AlertCircle className="h-3.5 w-3.5" /> FAILED</span>}
                                    </div>

                                    {/* Result View or Editable form */}
                                    {item.result && (
                                        <div className="relative group/edit">
                                            {!item.isEditing ? (
                                                <div className="flex flex-col gap-5 pr-14 relative bg-[#09090b] p-6 rounded-2xl border border-[#27272a] group-hover/edit:border-blue-500/40 transition-all shadow-inner">
                                                    <div className="flex flex-col gap-2">
                                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Asset Title</span>
                                                        <h4 className="text-lg font-black text-zinc-100 leading-snug tracking-tight" title={item.result.title}>{item.result.title}</h4>
                                                    </div>

                                                    <div className="flex flex-col gap-3">
                                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Suggested Keywords</span>
                                                        <div className="flex flex-wrap gap-2">
                                                            {item.result.keywords.split(',').map((kw, i) => (
                                                                <span key={`${item.id}-kw-${i}`} className={`text-[11px] font-black px-3 py-1.5 rounded-xl border transition-all uppercase tracking-tighter ${getKeywordBadgeStyle(i)}`}>
                                                                    {kw.trim()}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-3 mt-2 pt-4 border-t border-white/5">
                                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">AI Category:</span>
                                                        <span className="text-[10px] font-black bg-blue-600 text-white px-3 py-1 rounded-lg shadow-lg italic">ID {item.result.category}</span>
                                                    </div>

                                                    <button onClick={() => toggleEdit(item.id)} className="absolute top-6 right-6 p-3 bg-zinc-800 rounded-xl text-zinc-400 hover:text-white hover:bg-blue-600 transition-all opacity-0 group-hover/edit:opacity-100 shadow-2xl border border-zinc-700 active:scale-90">
                                                        <Edit2 className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-6 bg-[#0c0c0e] p-7 rounded-2xl border-2 border-blue-600/50 shadow-2xl animate-in zoom-in-95 duration-200">
                                                    <div className="flex flex-col gap-3">
                                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Edit Asset Title</label>
                                                        <Input value={item.result.title} onChange={(e) => updateResult(item.id, 'title', e.target.value)} className="h-12 text-base font-black bg-[#13131a] focus-visible:ring-blue-500/50 border-[#27272a] text-zinc-100 rounded-xl px-4" />
                                                    </div>
                                                    <div className="flex flex-col gap-3">
                                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Edit SEO Keywords</label>
                                                        <textarea
                                                            value={item.result.keywords}
                                                            onChange={(e) => updateResult(item.id, 'keywords', e.target.value)}
                                                            className="min-h-[160px] w-full rounded-xl border border-[#27272a] bg-[#13131a] px-5 py-4 text-sm font-bold text-zinc-200 ring-offset-background focus-visible:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-inner leading-relaxed"
                                                        />
                                                    </div>
                                                    <div className="flex justify-end gap-3 pt-2">
                                                        <Button size="sm" variant="ghost" onClick={() => toggleEdit(item.id)} className="h-12 text-xs font-black uppercase tracking-widest text-zinc-500 hover:bg-zinc-800 rounded-xl px-8">
                                                            CANCEL
                                                        </Button>
                                                        <Button size="sm" onClick={() => toggleEdit(item.id)} className="h-12 text-xs font-black gap-2 bg-blue-600 hover:bg-blue-500 text-white shadow-xl transition-all active:scale-95 rounded-xl px-10 border-b-4 border-blue-800 uppercase tracking-widest">
                                                            <Save className="h-4 w-4" /> SAVE CHANGES
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
