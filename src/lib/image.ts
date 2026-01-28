/**
 * Compresses an image file to a Base64 string with specified max width and quality.
 * This helps ensure that the Base64 string is small enough to be stored in MongoDB.
 * 
 * @param file The image file to compress
 * @param maxWidth The maximum width of the output image (default: 800px)
 * @param quality The quality of the JPEG compression (0 to 1, default: 0.6)
 * @returns A promise that resolves to the Base64 string
 */
export const compressImageToBase64 = (
    file: File,
    maxWidth: number = 800,
    quality: number = 0.6
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);
                // compressing to jpeg significantly reduces size compared to png
                const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
                resolve(compressedBase64);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};
