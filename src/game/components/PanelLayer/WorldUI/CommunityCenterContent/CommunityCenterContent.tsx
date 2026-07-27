// import { useState } from "react";
// import { apiFetch } from "../../../../../apiFetch";
import styles from "./CommunityCenterContent.module.css";

const electionInfo = [
    { name: "Bartholomew", votesPercent: 20, perks: [""] },
    { name: "George", votesPercent: 20 },
    { name: "Gregory", votesPercent: 20 },
    { name: "abcdef", votesPercent: 40 },
];

export default function CommunityCenterContent() {
    // const [candidates, setCandidates] = useState(null);

    // function fetchElection() {
    //     const response = apiFetch("/election");
    // }

    return (
        <div className={styles["content-layout"]}>
            <div className={styles["current-mayor"]}>Marlon</div>
            <div className={styles["perks-list"]}>
                <p>1 ...</p>
                <p>2 ...</p>
                <p>3 ...</p>
            </div>

            <div className={styles["voting-area"]}>
                {electionInfo.map((candidate, i) => (
                    <p key={candidate.name + i}>{candidate.name}</p>
                ))}
            </div>
        </div>
    );
}
