import styles from "./DefaultHeaderComponent.module.css";

export type DefaultHeaderComponentProps = {
    title: string;
};

export default function DefaultHeaderComponent({
    title,
}: DefaultHeaderComponentProps) {
    return (
        <div className={styles["header"]}>
            <div className={styles["title"]}>{title}</div>
        </div>
    );
}
