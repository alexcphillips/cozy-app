import ButtonsSection from "./Sections/Buttons/ButtonsSection";
import InfoSection from "./Sections/Info/InfoSection";
import SkillsSection from "./Sections/Skills/SkillsSection";
import styles from "./Sidebar.module.css";

export default function Sidebar() {
    return (
        <div className={styles["sidebar-container"]}>
            <InfoSection />
            <SkillsSection />
            <ButtonsSection />
        </div>
    );
}
