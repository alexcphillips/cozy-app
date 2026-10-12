import Drawer from "@/components/Drawer/Drawer";
import type { ReactNode } from "react";
import styles from "./CreateBudgetDrawer.module.css";

export type CreateBudgetDrawerProps = {
    content: ReactNode;
};

export default function CreateBudgetDrawer({
    content,
}: CreateBudgetDrawerProps) {
    return (
        <div className={styles["content-layout"]}>
            <Drawer />
        </div>
    );
}
