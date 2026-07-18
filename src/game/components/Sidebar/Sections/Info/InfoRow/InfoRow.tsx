import type { ReactNode } from "react";
import sharedStyles from "../../../Sidebar.shared.module.css";

export type InfoRowProps = {
    icon: ReactNode;
    label: string;
    value: string;
    color: string;
};

export default function InfoRow({ icon, label, value, color }: InfoRowProps) {
    return (
        <div className={sharedStyles["section-row"]}>
            <div className={sharedStyles["section-label"]}>
                {icon}
                <span>{label}</span>
            </div>
            <div className={sharedStyles["row-value"]} style={{ color }}>
                {value}
            </div>
        </div>
    );
}
