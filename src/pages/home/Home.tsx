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

        // Step 1: Start with all cards
        let currentCards = HOME_CONTENT_CARDS;

        // Step 2: First, filter out any cards that the user disabled in their settings modal
        currentCards = currentCards.filter((item) => item.isEnabled !== false);

        // Step 3: Next, filter by category if a filter tab is currently selected
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
