import styles from "./BackdropOverlay.module.css";

export type BackdropOverlayProps = {
    onClose: () => void;
};
export default function BackdropOverlay({ onClose }: BackdropOverlayProps) {
    return <div className={styles["backdrop-overlay"]} onClick={onClose} />;
}
