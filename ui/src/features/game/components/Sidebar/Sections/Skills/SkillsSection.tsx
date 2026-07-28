import SkillRow from "./SkillRow/SkillRow";
import sharedStyles from "../../Sidebar.shared.module.css";
import { LuSwords } from "react-icons/lu";
import { GiCrossbow } from "react-icons/gi";
import { FaHatWizard } from "react-icons/fa6";
import { FaGem } from "react-icons/fa";
import { FaTree } from "react-icons/fa";
import { TbCampfireFilled } from "react-icons/tb";
import { FaFish } from "react-icons/fa6";

const skills = [
    { label: "Melee", value: "90/99", color: "orange", icon: <LuSwords /> },
    { label: "Ranged", value: "90/99", color: "yellow", icon: <GiCrossbow /> },
    { label: "Magic", value: "90/99", color: "cyan", icon: <FaHatWizard /> },
    { label: "Mining", value: "90/99", color: "brown", icon: <FaGem /> },
    { label: "Foraging", value: "90/99", color: "green", icon: <FaTree /> },
    {
        label: "Firemaking",
        value: "90/99",
        color: "red",
        icon: <TbCampfireFilled />,
    },
    { label: "Fishing", value: "90/99", color: "blue", icon: <FaFish /> },
];

export default function SkillsSection() {
    return (
        <div className={sharedStyles["section"]}>
            <h2 className={sharedStyles["section-title"]}>SKILLS</h2>
            {skills.map((skillData, i) => (
                <SkillRow key={`${skillData.label}-${i}`} {...skillData} />
            ))}
        </div>
    );
}
