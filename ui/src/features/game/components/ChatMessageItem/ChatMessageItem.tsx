import styles from "./ChatMessageItem.module.css";

type ChatMessageItemProps = {
    user: string;
    text: string;
};

export default function ChatMessageItem({ user, text }: ChatMessageItemProps) {
    return (
        <div className={styles["chat-text"]}>
            user: {user} msg text: {text}
        </div>
    );
}
