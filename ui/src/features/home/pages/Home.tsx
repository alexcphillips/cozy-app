import LinkCard from "../../../components/LinkCard/LinkCard";
import styles from "./Home.module.css";
import { HOME_CONTENT_CARDS, type HomeItem } from "../home.items";
import { FILTER_CONFIG } from "../home.filters";
import { useState } from "react";
import AppFilterSection from "../../../components/Filters/AppFilterSection";

export default function Home() {
    const initialCards = HOME_CONTENT_CARDS.filter(
        (item) => item.isEnabled !== false,
    );
    const [displayedContent, setDisplayedContent] =
        useState<HomeItem[]>(initialCards);

    // AppFilterSection owns which chip is selected; this page only needs the
    // resulting card list.
    const handleFilterChange = (selectedId: string | null) => {
        let currentCards = HOME_CONTENT_CARDS.filter(
            (item) => item.isEnabled !== false,
        );

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
