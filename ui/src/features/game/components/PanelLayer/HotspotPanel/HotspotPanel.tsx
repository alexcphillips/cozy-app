import type { HotspotView } from "../../../stores/ui/ui.types";
import Panel from "../Panel/Panel";
import CastleContent from "../WorldUI/CastleContent/CastleContent";
import CastleDungeonsContent from "../WorldUI/CastleDungeonsContent/CastleDungeonsContent";
import CommunityCenterContent from "../WorldUI/CommunityCenterContent/CommunityCenterContent";
import PortalContent from "../WorldUI/PortalContent/PortalContent";
import PortContent from "../WorldUI/PortContent/PortContent";
import TownContent from "../WorldUI/TownContent/TownContent";

type HotspotDefinition = {
    title: string;
    Component: React.ComponentType;
};

const hotspotMap: Partial<Record<HotspotView, HotspotDefinition>> = {
    port: {
        title: "Port",
        Component: PortContent,
    },
    castle: {
        title: "Castle",
        Component: CastleContent,
    },
    castle_dungeons: {
        title: "Dungeons",
        Component: CastleDungeonsContent,
    },
    town: {
        title: "Town",
        Component: TownContent,
    },
    portal: {
        title: "Portal",
        Component: PortalContent,
    },
    community_center: {
        title: "Community Center",
        Component: CommunityCenterContent,
    },
};

export default function HotspotPanel({ panel }: { panel: HotspotView }) {
    const data = hotspotMap[panel];

    if (!data) return null;

    const Content = data.Component;

    return (
        <Panel size="medium" title={data.title}>
            <Content />
        </Panel>
    );
}
