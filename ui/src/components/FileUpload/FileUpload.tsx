import { useRef, useState } from "react";
import { apiFetch } from "../../lib/api/apiFetch";
import styles from "./FileUpload.module.css";

export type FileUploadProps = { apiUrl: string; fileName: string };

export default function FileUpload({ apiUrl, fileName }: FileUploadProps) {
    const [uploading, setUploading] = useState(false);
    const hiddenInputRef = useRef<HTMLInputElement>(null);

    async function handleFileChange(
        event: React.ChangeEvent<HTMLInputElement>,
    ) {
        const file = event.target.files && event.target.files[0];

        if (!file) return;

        setUploading(true);

        const formData = new FormData();
        if (file) formData.append(fileName, file);

        try {
            const response = await apiFetch(apiUrl, {
                method: "POST",
                body: formData,
            });

            if (response.ok) {
                console.log("File uploaded successfully!");
            } else {
                console.log("Upload failed.");
            }
        } catch (error) {
            console.error("Error uploading file:", error);
        } finally {
            setUploading(false);
            event.target.value = "";
        }
    }

    function handleButtonClick() {
        hiddenInputRef.current?.click();
    }

    return (
        <div className={styles["upload-section"]}>
            <input
                type="file"
                ref={hiddenInputRef}
                onChange={handleFileChange}
                className={styles["display-none"]}
                accept="image/*"
            />

            <button
                type="button"
                onClick={handleButtonClick}
                disabled={uploading}
                className={styles["file-upload-button"]}
            >
                Upload!
            </button>
        </div>
    );
}
