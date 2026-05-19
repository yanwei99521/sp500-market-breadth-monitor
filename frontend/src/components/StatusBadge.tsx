import { getZoneDotColor, getZoneLabel, getZoneTextColor } from "../config/indicators";
import type { IndicatorType, IndicatorZone } from "../types/indicator";

interface Props {
  type: IndicatorType;
  zone: IndicatorZone;
}

export default function StatusBadge({ type, zone }: Props) {
  const label = getZoneLabel(type, zone);
  const textColor = getZoneTextColor(type, zone);
  const dotColor = getZoneDotColor(type, zone);
  const isActive = zone === "active";

  const bgColor =
    !isActive
      ? "bg-zinc-100 border-zinc-200"
      : type === "buy"
        ? "bg-green-100 border-green-300"
        : "bg-red-100 border-red-300";

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${bgColor} ${textColor}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${dotColor} ${isActive ? "animate-pulse" : ""}`}
      />
      {label}
    </span>
  );
}
