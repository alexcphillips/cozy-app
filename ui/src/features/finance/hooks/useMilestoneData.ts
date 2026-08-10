import { useEffect, useState } from "react";
import type {
    CreateMilestoneRequest,
    Milestone,
    MilestoneEdit,
} from "@cozy/shared";

export function useMilestoneData() {
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [milestoneError, setMilestoneError] = useState("");

    useEffect(() => {
        getMilestones();
    }, []);

    async function getMilestones() {}
    async function createMilestone(input: CreateMilestoneRequest) {}
    async function editMilestones(edits: MilestoneEdit[]) {}
    async function deleteMilestone(milestoneId: number) {}

    return {
        milestones,
        milestoneError,
        getMilestones,
        createMilestone,
        editMilestones,
        deleteMilestone,
    };
}
