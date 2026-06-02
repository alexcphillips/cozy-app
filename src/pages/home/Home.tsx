import LinkCard from "../../components/ui/LinkCard/LinkCard";
import styles from "./Home.module.css";
import { HOME_CONTENT_CARDS, type HomeItem } from "../../config/homeItems";
import { FILTER_CONFIG } from "../../config/homeItemFilters";
import { useState } from "react";
import AppFilterSection from "../../components/ui/Filters/AppFilterSection";

export default function Home() {
    const [activeFilter, setActiveFilter] = useState<string | null>(null);
    const [displayedContent, setDisplayedContent] =
        useState<HomeItem[]>(HOME_CONTENT_CARDS);

    const handleFilterChange = (selectedId: string | null) => {
        setActiveFilter(selectedId);

        let currentCards = HOME_CONTENT_CARDS;

        currentCards = currentCards.filter((item) => item.isEnabled !== false);

        if (selectedId) {
            currentCards = currentCards.filter(
                (item) => item.category === selectedId,
            );
        }

        setDisplayedContent(currentCards);
    };

    return (
        <div className={styles["home-page-container"]}>
            <h1 className={styles["home-title"]}>Apps</h1>

            <AppFilterSection
                filters={FILTER_CONFIG}
                onChange={handleFilterChange}
            />

            <div className={styles["cards-container"]}>
                {displayedContent.map((item) => (
                    <LinkCard key={item.title} {...item} />
                ))}
            </div>
        </div>
    );
}
