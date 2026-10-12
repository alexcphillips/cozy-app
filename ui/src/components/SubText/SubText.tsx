import styles from "./SubText.module.css";

type SubTextProps = {
    text: string;
};

export default function SubText({ text }: SubTextProps) {
    return <p className={styles["subtext"]}>{text}</p>;
}
