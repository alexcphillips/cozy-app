export type HomeItem = {
    title: string;
    to: string;
    border: string;
    icon: string;
    isEnabled: boolean;
    category: string;
    description?: string;
};

export const HOME_CONTENT_CARDS: HomeItem[] = [
    {
        title: "React Patterns & Docs",
        to: "/react-docs",
        border: "1px solid red",
        icon: "",
        isEnabled: true,
        category: "coding",
    },
    {
        title: "Budgeting",
        to: "/budgeting",
        border: "1px solid blue",
        icon: "",
        isEnabled: true,
        category: "finance",
    },
    {
        title: "Subscription Manager",
        to: "/subscription-manager",
        border: "1px solid green",
        icon: "",
        isEnabled: true,
        category: "finance",
    },
    {
        title: "Gym Tracker",
        to: "/gym-tracker",
        border: "1px solid silver",
        icon: "",
        isEnabled: true,
        category: "fitness",
    },
    {
        title: "Habits RPG Game",
        to: "/habit-game",
        border: "1px solid yellow",
        icon: "",
        isEnabled: true,
        category: "fun",
    },
    {
        title: "Cozy Care",
        to: "/cozy-care",
        border: "1px solid #f2b1ff",
        icon: "",
        isEnabled: true,
        category: "fitness",
        description: "Track weight, habits, and water",
    },
    {
        title: "Custom Reminder Emails",
        to: "/custom-email-reminders",
        border: "1px solid lightpink",
        icon: "",
        isEnabled: true,
        category: "utility",
    },
    {
        title: "Spotify Tracker",
        to: "/spotify-tracker",
        border: "1px solid lime",
        icon: "",
        isEnabled: true,
        category: "fun",
    },
    {
        title: "Book Club",
        to: "/book-club",
        border: "1px solid purple",
        icon: "",
        isEnabled: true,
        category: "reading",
    },
    {
        title: "Book Tracker",
        to: "/book-tracker",
        border: "1px solid salmon",
        icon: "",
        isEnabled: true,
        category: "reading",
    },
];
