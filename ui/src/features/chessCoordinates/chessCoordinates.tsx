import { useEffect, useRef, useState } from "react";
import styles from "./ChessCoordinates.module.css";

const GUESS_FEEDBACK_MS = 1000;

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const RANKS = [8, 7, 6, 5, 4, 3, 2, 1] as const;

const squares = RANKS.flatMap((rank) => FILES.map((file) => `${file}${rank}`));

function pickRandomSquare(): string {
    return squares[Math.floor(Math.random() * squares.length)] as string;
}

function isLightSquare(square: string): boolean {
    const file = square.charCodeAt(0) - "a".charCodeAt(0);
    const rank = Number(square[1]);
    return (file + rank) % 2 === 0;
}

type Feedback = {
    clicked: string;
    correctSquare: string;
    wasCorrect: boolean;
};

export default function ChessCoordinates() {
    const [target, setTarget] = useState(pickRandomSquare);
    const [streak, setStreak] = useState(0);
    const [flipped, setFlipped] = useState(false);
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const feedbackTimeout = useRef<number | null>(null);

    useEffect(() => {
        return () => {
            if (feedbackTimeout.current !== null) {
                window.clearTimeout(feedbackTimeout.current);
            }
        };
    }, []);

    const displaySquares = flipped ? [...squares].reverse() : squares;

    function handleGuess(square: string) {
        if (feedback) return;

        const wasCorrect = square === target;
        setFeedback({ clicked: square, correctSquare: target, wasCorrect });

        feedbackTimeout.current = window.setTimeout(() => {
            setStreak((prev) => (wasCorrect ? prev + 1 : 0));
            setTarget(pickRandomSquare());
            setFeedback(null);
        }, GUESS_FEEDBACK_MS);
    }

    function squareFeedbackClass(square: string): string {
        if (!feedback) return "";
        if (square === feedback.clicked) {
            return feedback.wasCorrect
                ? styles["square-correct"]!
                : styles["square-wrong"]!;
        }
        if (!feedback.wasCorrect && square === feedback.correctSquare) {
            return styles["square-correct"]!;
        }
        return "";
    }

    return (
        <div className={styles["container"]}>
            <div className={styles["header"]}>
                <p className={styles["steak-counter"]}>Streak: {streak} 🔥</p>
            </div>
            <p className={styles["target"]}>Target: {target}</p>
            <div className={styles["board"]}>
                {displaySquares.map((square) => (
                    <button
                        key={square}
                        className={`${styles["square"]} ${
                            isLightSquare(square)
                                ? styles["square-light"]
                                : styles["square-dark"]
                        } ${squareFeedbackClass(square)}`}
                        onClick={() => handleGuess(square)}
                    />
                ))}
            </div>
            <div className={styles["orientation-row"]}>
                <p className={styles["orientation"]}>
                    Viewing from {flipped ? "Black" : "White"}
                </p>
                <button
                    className={styles["flip-board-button"]}
                    onClick={() => setFlipped((prev) => !prev)}
                >
                    Flip board
                </button>
            </div>
        </div>
    );
}
