import type { ReactNode } from "react";
import { IoWalletSharp } from "react-icons/io5";
import { TbDeviceGamepadFilled } from "react-icons/tb";
import { FaWeightHanging } from "react-icons/fa";
import { FaStar } from "react-icons/fa6";
import { FaFileCode } from "react-icons/fa";

export type FilterConfigItem = {
    id: string;
    label: string;
    icon: ReactNode;
};

export const FILTER_CONFIG: FilterConfigItem[] = [
    { id: "finance", label: "Finance", icon: <IoWalletSharp /> },
    { id: "fun", label: "Fun", icon: <TbDeviceGamepadFilled /> },
    { id: "fitness", label: "Fitness", icon: <FaWeightHanging /> },
    { id: "utility", label: "Utility", icon: <FaStar /> },
    { id: "coding", label: "Coding", icon: <FaFileCode /> },
    { id: "reading", label: "Reading", icon: <FaFileCode /> },
] as const;

export type ActiveFilter = (typeof FILTER_CONFIG)[number]["id"];
