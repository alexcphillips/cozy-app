import InfoRow from "./InfoRow/InfoRow";
import sharedStyles from "../../Sidebar.shared.module.css";
import { FaStar } from "react-icons/fa6";
import { FaCoins } from "react-icons/fa6";
import { FaHeart } from "react-icons/fa6";
import { FaDroplet } from "react-icons/fa6";

const playerDataRows = [
    { label: "Level", value: "450", color: "green", icon: <FaStar /> },
    { label: "Gold", value: "12345678", color: "yellow", icon: <FaCoins /> },
    { label: "HP", value: "25000", color: "red", icon: <FaHeart /> },
    { label: "Mana", value: "15000", color: "cyan", icon: <FaDroplet /> },
];

export default function InfoSection() {
    // const gold = usePlayerStore((s) => s.gold)

    return (
        <div className={sharedStyles["section"]}>
            <h2 className={sharedStyles["section-title"]}>PLAYER</h2>
            {playerDataRows.map((playerData, i) => (
                <InfoRow key={`${playerData.label}-${i}`} {...playerData} />
            ))}
        </div>
    );
}
