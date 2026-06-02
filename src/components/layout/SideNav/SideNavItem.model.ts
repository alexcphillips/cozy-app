export type SideNavItemType = {
    label: string;
    path?: string;
    children?: SideNavItemType[];
    icon?: React.ReactNode;
    disabled?: boolean;
};
