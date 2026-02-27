// Helper to resize image before sending to Gemini
// Return base64 JPEG format.

export const resizeImageFile = (file: File, maxWidth = 800): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");

                if (!ctx) {
                    return reject("Failed to get canvas context");
                }

                let width = img.width;
                let height = img.height;

                // Calculate aspect ratio
                if (width > maxWidth) {
                    height = (maxWidth / width) * height;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to base64 jpeg with 0.8 quality (compression)
                const dataUrl = canvas.toDataURL("image/jpeg", 0.8);

                // Return base64 format without data:image/jpeg;base64, prefix for API
                const base64Data = dataUrl.split(",")[1];
                resolve(base64Data);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};
