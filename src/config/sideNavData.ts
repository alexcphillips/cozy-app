import type { SideNavItemType } from "../components/layout/SideNav/SideNavItem.model";

export const sideNavItems: SideNavItemType[] = [
    {
        label: "Components",
        children: [
            {
                label: "Table",
                path: "/components/table",
            },
            {
                label: "Button",
                path: "/components/button",
            },
            {
                label: "Modal",
                path: "/components/modal",
            },
        ],
    },
    {
        label: "Patterns",
        children: [
            {
                label: "Controlled vs Uncontrolled",
                path: "/patterns/controlled-vs-uncontrolled",
            },
            {
                label: "Compound Components",
                path: "/patterns/compound",
            },
            {
                label: "Render Props",
                path: "/patterns/render-props",
            },
        ],
    },
    {
        label: "Guides",
        children: [
            {
                label: "Styling Strategy",
                path: "/guides/styling-strategy",
            },
            {
                label: "Accessibility",
                path: "/guides/accessibility",
            },
            {
                label: "State Management",
                path: "/guides/state-management",
            },
        ],
    },
];
