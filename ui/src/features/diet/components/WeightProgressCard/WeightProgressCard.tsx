import styles from "./WeightProgressCard.module.css";

type WeightProgressCardProps = {
    progress: number;
};

export default function WeightProgressCard({
    progress,
}: WeightProgressCardProps) {
    const sign = progress > 0 ? "+" : "";

    return (
        <div className={styles["weight-progress-section"]}>
            <div className={styles["weight-progress-header"]}>
                Weight Progress
            </div>
            <div className={styles["weight-progress-this-month"]}>
                This Month: {sign}
                {progress.toFixed(1)} lbs
            </div>
            <img
                className={styles["weight-progress-image"]}
                src="/apple-scale.png"
                alt="Scale illustration"
            />
        </div>
    );
}
