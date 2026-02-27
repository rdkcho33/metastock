import { GeminiResponse } from "./gemini-service";

export class GroqService {
    private static readonly ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
    private static readonly MODEL = "llama-3.2-11b-vision-preview"; // Model vision stabil Groq

    /**
     * Mengirim gambar (base64) ke Groq API
     * @param apiKey API key aktif yang digunakan user (gsk_...)
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
1. Berikan respon HANYA menggunakan format JSON valid! Tanpa block markdown \`\`\`json. Jangan ada intro, outro, atau penjelasan tambahan.
2. Title: Panjang antara 50 - ${titleLimit} karakter berbahasa Inggris. Harus deskriptif merepresentasikan objek utama dan suasana gambar.
3. Keywords: Tepat ${keywordLimit} kata kunci berbahasa Inggris, dipisahkan koma (tanpa petik). Urutkan 10 keyword paling relevan di awal.
4. Category: Pilih 1 angka Kategori Adobe Stock yang paling relevan. Hanya berupa bentuk String "1" sampai "21".

KATEGORI ADOBE STOCK:
1 = Animals, 2 = Buildings and Architecture, 3 = Business, 4 = Drinks, 5 = Environment, 6 = States of Mind, 7 = Food, 8 = Graphic Resources, 9 = Hobbies and Leisure, 10 = Industry, 11 = Landscapes, 12 = Lifestyle, 13 = People, 14 = Plants and Flowers, 15 = Culture and Religion, 16 = Science, 17 = Social Issues, 18 = Sports, 19 = Technology, 20 = Transport, 21 = Travel

**OUTPUT HARUS MURNI JSON SEPERTI INI**:
{
  "title": "contoh judul deskriptif berbahasa inggris gambar",
  "keywords": "keyword1, keyword2, keyword3, deskriptif, emotion",
  "category": "15"
}
`;

        const imageDataUrl = `data:image/jpeg;base64,${base64Image}`;

        const requestBody = {
            model: this.MODEL,
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        {
                            type: "image_url",
                            image_url: {
                                url: imageDataUrl,
                            },
                        },
                    ],
                },
            ],
            temperature: 0.1,
        };

        try {
            const response = await fetch(this.ENDPOINT, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey.trim()}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody),
            });

            if (response.status === 429) {
                throw new Error("QUOTA_EXCEEDED");
            }

            if (!response.ok) {
                throw new Error(`Groq API Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            let textResult = data.choices?.[0]?.message?.content;

            if (!textResult) {
                throw new Error("No response content from Groq");
            }

            textResult = textResult.trim();
            if (textResult.startsWith("```json")) textResult = textResult.substring(7);
            if (textResult.startsWith("```")) textResult = textResult.substring(3);
            if (textResult.endsWith("```")) textResult = textResult.substring(0, textResult.length - 3);

            const parsed = JSON.parse(textResult.trim()) as GeminiResponse;
            return parsed;

        } catch (error) {
            console.error("Groq API Error:", error);
            throw error;
        }
    }

    /**
     * Mengekstrak gambar menjadi Prompt Deskriptif
     * @param variation 0 - 100
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
Termasuk: Subjek utama, gaya visual, pencahayaan, sudut kamera, aspek emosional, komposisi, medium.
Maksimum 100 kata.`;

        const imageDataUrl = `data:image/jpeg;base64,${base64Image}`;

        const requestBody = {
            model: this.MODEL,
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        {
                            type: "image_url",
                            image_url: {
                                url: imageDataUrl,
                            },
                        },
                    ],
                },
            ],
            temperature: 0.3,
        };

        try {
            const response = await fetch(this.ENDPOINT, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey.trim()}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody),
            });

            if (response.status === 429) {
                throw new Error("QUOTA_EXCEEDED");
            }

            if (!response.ok) {
                throw new Error(`Groq API Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            let textResult = data.choices?.[0]?.message?.content;

            if (!textResult) {
                throw new Error("No response content from Groq");
            }

            return textResult.trim();
        } catch (error) {
            console.error("Groq Prompt API Error:", error);
            throw error;
        }
    }
}
