import SubText from "../SubText/SubText";
import styles from "./PageHeader.module.css";

type PageHeaderProps = {
    text: string;
    subText?: string;
};

export default function PageHeader({ text, subText }: PageHeaderProps) {
    return (
        <div className={styles["header-container"]}>
            <h1 className={styles["header-text"]}>{text}</h1>
            {subText && <SubText text={subText} />}
        </div>
    );
}
