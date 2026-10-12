import { useSearchParams } from "react-router-dom";
import styles from "./Library.module.css";
import PageHeader from "@/components/PageHeader/PageHeader";
import Tab from "@/components/Tab/Tab";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import { useBookSearch } from "../hooks/useBookSearch";
import { useLibrary } from "../hooks/useLibrary";
import MeTab from "../tabs/MeTab";
import DiscoverTab from "../tabs/DiscoverTab";
import MyLibraryTab from "../tabs/MyLibraryTab";
import BookClubTab from "../tabs/BookClubTab";

const TABS = [
    { id: "me", label: "Me", subText: "What you're reading right now" },
    { id: "discover", label: "Discover", subText: "Find your next read" },
    {
        id: "my-library",
        label: "My Library",
        subText: "Everything on your shelf",
    },
    {
        id: "book-club",
        label: "Book Club",
        subText: "What everyone's reading together",
    },
] as const;

type TabId = (typeof TABS)[number]["id"];

/** Me, not Discover: you log reading daily and search for books occasionally. */
const DEFAULT_TAB: TabId = "me";

function isTabId(value: string | null): value is TabId {
    return TABS.some((tab) => tab.id === value);
}

export default function Library() {
    // The tab lives in the URL so refresh, back/forward, and shared links all
    // land on the same tab.
    const [searchParams, setSearchParams] = useSearchParams();
    const tabParam = searchParams.get("tab");
    const activeTabId: TabId = isTabId(tabParam) ? tabParam : DEFAULT_TAB;

    // Both held here rather than inside the tabs, so switching tabs doesn't
    // discard an in-progress search or refetch the shelf.
    const search = useBookSearch();
    const library = useLibrary();

    function handleSelectTab(tabId: TabId) {
        setSearchParams(
            (previous) => {
                const next = new URLSearchParams(previous);
                next.set("tab", tabId);
                return next;
            },
            { replace: true },
        );
    }

    const activeTab = TABS.find((tab) => tab.id === activeTabId) ?? TABS[0];

    return (
        <div className={styles["page"]}>
            <PageHeader text="Library" subText={activeTab.subText} />

            <div className={styles["tab-bar"]} role="tablist">
                {TABS.map((tab) => (
                    <Tab
                        key={tab.id}
                        title={tab.label}
                        isActive={tab.id === activeTabId}
                        handleClick={() => handleSelectTab(tab.id)}
                    />
                ))}
            </div>

            <div className={styles["tab-panel"]} role="tabpanel">
                {library.error && <ErrorMessage message={library.error} />}

                {activeTabId === "me" && (
                    <MeTab
                        books={library.books}
                        isLoading={library.isLoading}
                        pendingId={library.pendingId}
                        onLogProgress={library.logProgress}
                        onSetStatus={library.setStatus}
                    />
                )}

                {activeTabId === "discover" && (
                    <DiscoverTab
                        search={search}
                        savedVolumeIds={library.savedVolumeIds}
                        onAddToLibrary={library.addBook}
                    />
                )}

                {activeTabId === "my-library" && (
                    <MyLibraryTab
                        books={library.books}
                        isLoading={library.isLoading}
                        pendingId={library.pendingId}
                        onSetStatus={library.setStatus}
                    />
                )}

                {activeTabId === "book-club" && <BookClubTab />}
            </div>
        </div>
    );
}
