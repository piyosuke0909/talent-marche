import { storage } from "./firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

/**
 * Uploads a file to Firebase Storage and returns the public download URL.
 * @param file The file object to upload
 * @param path The path in storage (e.g. 'users/uid/avatar')
 * @returns Promise resolving to the download URL
 */
export async function uploadImage(file: File, path: string): Promise<string> {
    if (!file) throw new Error("No file provided");

    // Create a storage reference
    // Ensure unique filename if needed, or overwrite if intended
    // We'll append timestamp to filename to avoid caching issues/collisions within the same path if needed
    // usage: uploadImage(file, `services/${Date.now()}_${file.name}`)

    const storageRef = ref(storage, path);

    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    return downloadURL;
}
