// Interface Helper untuk Integrasi Gemini Client-side
export interface GeminiResponse {
    title: string;
    keywords: string;
    category: string;
}

export class GeminiService {
    private static readonly ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

    /**
     * Mengirim gambar (base64) ke Gemini API
     * @param apiKey API key aktif yang digunakan user
     * @param base64Image String base64 gambar tanpa prefix `data:image/jpeg;base64,`
     * @param titleLimit Karakter judul (50-200)
     * @param keywordLimit Jumlah keyword (10-50)
     * @returns Promise objek JSON metadata Adobe Stock
     */
    static async generateMetadata(
        apiKey: string,
        base64Image: string,
        titleLimit = 100,
        keywordLimit = 50
    ): Promise<GeminiResponse> {
        const prompt = `
Anda adalah ahli taksonomi gambar dan penyedia metadata untuk platform microstock (Adobe Stock, Shutterstock).
Tugas Anda adalah menganalisis gambar ini dan menghasilkan Title, Keywords, dan Category yang optimal agar gambar ini laku dijual.

**Aturan Penting**:
1. Berikan respon HANYA menggunakan format JSON valid. Jangan tambahkan penjelasan teks apapun di luar array JSON.
2. Title: Panjang antara 50 - ${titleLimit} karakter berbahasa Inggris. Harus deskriptif merepresentasikan objek utama dan suasana gambar.
3. Keywords: Tepat ${keywordLimit} kata kunci berbahasa Inggris, dipisahkan koma (tanpa petik). Urutkan 10 keyword paling relevan di awal.
4. Category: Pilih 1 angka Kategori Adobe Stock yang paling relevan. Hanya boleh berupa String 1 sampai 21.

DAFTAR KATEGORI ADOBE STOCK:
1 = Animals, 2 = Buildings and Architecture, 3 = Business, 4 = Drinks, 5 = Environment, 6 = States of Mind, 7 = Food, 8 = Graphic Resources, 9 = Hobbies and Leisure, 10 = Industry, 11 = Landscapes, 12 = Lifestyle, 13 = People, 14 = Plants and Flowers, 15 = Culture and Religion, 16 = Science, 17 = Social Issues, 18 = Sports, 19 = Technology, 20 = Transport, 21 = Travel

**Format Wajib JSON**:
{
  "title": "contoh judul deskriptif berbahasa inggris gambar tersebut",
  "keywords": "keyword1, keyword2, keyword3, deskriptif, emotion, dll",
  "category": "15"
}
`;

        const requestBody = {
            contents: [
                {
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType: "image/jpeg",
                                data: base64Image,
                            },
                        },
                    ],
                },
            ],
            generationConfig: {
                responseMimeType: "application/json",
            }
        };

        try {
            const trimmedKey = apiKey.trim();
            const response = await fetch(`${this.ENDPOINT}?key=${trimmedKey}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody),
            });

            if (response.status === 429) {
                throw new Error("QUOTA_EXCEEDED");
            }

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!textResult) {
                throw new Error("No response content from Gemini");
            }

            const parsed = JSON.parse(textResult) as GeminiResponse;
            return parsed;

        } catch (error) {
            console.error("Gemini API Error:", error);
            throw error;
        }
    }

    /**
     * Mengekstrak gambar menjadi Prompt Deskriptif
     * @param variation 0 - 100 (Semakin tinggi semakin berbeda dari aslinya untuk hindari copyright)
     */
    static async generatePrompt(apiKey: string, base64Image: string, variation = 0): Promise<string> {
        let variationInstruction = "";
        if (variation > 20) {
            variationInstruction = `
PENTING (HINDARI COPYRIGHT): Lakukan sedikit modifikasi pada subjek. Ubah warna baju, ganti objek latar belakang, atau ubah suasana lingkungan agar tidak persis 100% dengan aslinya namun tetap mempertahankan komposisi dasar. Berikan instruksi kreatif tambahan untuk membedakan hasil akhir.
`;
        }

        const prompt = `Anda adalah ahli pengamat gambar detail dan prompt engineer Midjourney/Stable Diffusion.
Tugas Anda: Deskripsikan gambar yang diberikan dengan saksama dan detail sebagai prompt gambar berbahasa Inggris. ${variationInstruction}
Tidak perlu basa-basi, langsung berikan output prompt teks berbahasa Inggris.
Termasuk: Subjek utama, gaya visual, pencahayaan, kualitas kamera, aspek emosional, medium, efek tekstur.
Maksimum 100 kata.`;

        const requestBody = {
            contents: [
                {
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType: "image/jpeg",
                                data: base64Image,
                            },
                        },
                    ],
                },
            ],
        };

        try {
            const trimmedKey = apiKey.trim();
            const response = await fetch(`${this.ENDPOINT}?key=${trimmedKey}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody),
            });

            if (response.status === 429) {
                throw new Error("QUOTA_EXCEEDED");
            }

            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            const textResult = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!textResult) {
                throw new Error("No response content from Gemini");
            }

            return textResult.trim();
        } catch (error) {
            console.error("Gemini Prompt API Error:", error);
            throw error;
        }
    }
}
