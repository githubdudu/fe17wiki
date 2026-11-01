import { Draggable } from "./dnd";
import type { Drag, Kind } from "./rules";

function Avatar({ src, size }: { src?: string; size: number }) {
  return (
    src && (
      <img
        className="block rounded-md bg-brand-gray object-cover"
        src={src}
        alt=""
        width={size}
        height={size}
        draggable={false}
      />
    )
  );
}

// Tailwind 只认完整类名，不能用 `border-kind-${kind}` 拼接
const COLOR_CLASSES: Record<Kind, string> = {
  character:
    "border-kind-character/55 bg-kind-character/8 hover:bg-kind-character/22",
  class: "border-kind-class/55 bg-kind-class/8 hover:bg-kind-class/22",
  emblem: "border-kind-emblem/55 bg-kind-emblem/8 hover:bg-kind-emblem/22",
  weapon: "border-kind-weapon/55 bg-kind-weapon/8 hover:bg-kind-weapon/22",
  engrave: "border-kind-weapon/55 bg-kind-weapon/22 hover:bg-kind-weapon/40",
  row: "",
};

/** 小图 + 名字的可拖胶囊（角色、职业、纹章士、刻印）。label 缺省显示 d.value（角色的 value 是 id，需传名字）。 */
export function Chip({
  d,
  img,
  label,
}: {
  d: Drag;
  img?: string;
  label?: string;
}) {
  return (
    <Draggable
      d={d}
      className={`chip inline-flex items-center gap-1 py-px pr-2 pl-px align-middle rounded-md border text-base whitespace-nowrap ${COLOR_CLASSES[d.kind]}`}
    >
      <Avatar src={img} size={22} />
      {label ?? d.value}
    </Draggable>
  );
}
