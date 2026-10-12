import Button from "@/components/Button/Button";

type AddToLibraryButtonProps = {
    onClick: () => void;
    isSaved?: boolean;
};

export default function AddToLibraryButton({
    onClick,
    isSaved = false,
}: AddToLibraryButtonProps) {
    return (
        <Button
            text={isSaved ? "Saved ✓" : "Add"}
            onClick={onClick}
            disabled={isSaved}
        />
    );
}
