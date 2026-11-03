import { useState, type ReactNode, Children } from "react";
import { Chip } from "./Chip";
import { Zone } from "./dnd";
import type { Row, Tab } from "./rules";
import type { Character, Named } from "./types";

/** 下方的标签页：列出还没用过的可拖项，也是「拖回清掉」的目标。hint 是拖动时的高亮类名。 */
export function Pool({
  characters,
  classes,
  emblems,
  rows,
  hint,
}: {
  characters: Character[];
  classes: Named[];
  emblems: Named[];
  rows: Row[];
  hint: string;
}) {
  const [tab, setTab] = useState<Tab>("character");
  const inTeam = new Set(rows.map((r) => r.id));
  const usedEmblems = new Set(rows.flatMap((r) => r.emblems));
  const usedEngraves = new Set(
    rows.flatMap((r) => r.weapons.map((w) => w.engrave)),
  );
  const content: Record<Tab, ReactNode> = {
    character: [
      ...Map.groupBy(
        characters.filter((c) => !inTeam.has(c.id)),
        (c) => c.group ?? "",
      ),
    ].map(([g, list]) => (
      <Group key={g} label={g}>
        {list.map((c) => (
          <Chip
            key={c.id}
            d={{ kind: "character", value: c.id }}
            img={c.img}
            label={c.name}
          />
        ))}
      </Group>
    )),
    class: [...Map.groupBy(classes, (c) => c.group ?? "")].map(([g, list]) => (
      <Group key={g} label={g}>
        {list.map((c) => (
          <Chip key={c.name} d={{ kind: "class", value: c.name }} img={c.img} />
        ))}
      </Group>
    )),
    emblem: [
      ...Map.groupBy(
        emblems.filter((e) => !usedEmblems.has(e.name)),
        (e) => e.group ?? "",
      ),
    ].map(([g, list]) => (
      <Group key={g} label={g}>
        {list.map((e) => (
          <Chip
            key={e.name}
            d={{ kind: "emblem", value: e.name }}
            img={e.img}
          />
        ))}
      </Group>
    )),
    weapon: (
      <Group>
        {/* 武器的 value 是它带的刻印，新武器没有刻印 */}
        <Chip d={{ kind: "weapon", value: "" }} label="武器待定" />
      </Group>
    ),
    engrave: [
      ...Map.groupBy(
        emblems.filter((e) => !usedEngraves.has(e.name)),
        (e) => e.group ?? "",
      ),
    ].map(([g, list]) => (
      <Group key={g} label={g}>
        {list.map((e) => (
          <Chip
            key={e.name}
            d={{ kind: "engrave", value: e.name }}
            img={e.img}
          />
        ))}
      </Group>
    )),
  };
  return (
    <Zone
      as="div"
      t="pool"
      className={`mt-4 border border-brand-border ${hint}`}
    >
      <div
        className="flex flex-wrap items-center bg-brand-lightblue border-b border-brand-border"
        role="tablist"
      >
        <button
          role="tab"
          className={`px-[0.9rem] py-2 border-0 text-brand-gray cursor-pointer hover:text-[#262a3f] hover:bg-kind-character/22 bg-kind-character/8 ${tab === "character" ? "font-bold text-[#262a3f] inset-shadow-[0_-3px] inset-shadow-kind-character" : ""}`}
          aria-selected={tab === "character"}
          onClick={() => setTab("character")}
        >
          角色
        </button>
        <button
          role="tab"
          className={`px-[0.9rem] py-2 border-0 text-brand-gray cursor-pointer hover:text-[#262a3f] hover:bg-kind-class/22 bg-kind-class/8 ${tab === "class" ? "font-bold text-[#262a3f] inset-shadow-[0_-3px] inset-shadow-kind-class" : ""}`}
          aria-selected={tab === "class"}
          onClick={() => setTab("class")}
        >
          职业
        </button>
        <button
          role="tab"
          className={`px-[0.9rem] py-2 border-0 text-brand-gray cursor-pointer hover:text-[#262a3f] hover:bg-kind-emblem/22 bg-kind-emblem/8 ${tab === "emblem" ? "font-bold text-[#262a3f] inset-shadow-[0_-3px] inset-shadow-kind-emblem" : ""}`}
          aria-selected={tab === "emblem"}
          onClick={() => setTab("emblem")}
        >
          纹章士
        </button>
        <button
          role="tab"
          className={`px-[0.9rem] py-2 border-0 text-brand-gray cursor-pointer hover:text-[#262a3f] hover:bg-kind-weapon/22 bg-kind-weapon/8 ${tab === "weapon" ? "font-bold text-[#262a3f] inset-shadow-[0_-3px] inset-shadow-kind-weapon" : ""}`}
          aria-selected={tab === "weapon"}
          onClick={() => setTab("weapon")}
        >
          武器
        </button>
        <button
          role="tab"
          className={`px-[0.9rem] py-2 border-0 text-brand-gray cursor-pointer hover:text-[#262a3f] hover:bg-kind-weapon/40 bg-kind-weapon/22 ${tab === "engrave" ? "font-bold text-[#262a3f] inset-shadow-[0_-3px] inset-shadow-kind-weapon" : ""}`}
          aria-selected={tab === "engrave"}
          onClick={() => setTab("engrave")}
        >
          刻印
        </button>
        <span className="ms-auto px-3 text-brand-gray/70 text-xs">
          表格里的项拖回这里即清掉
        </span>
      </div>
      <div className="" role="tabpanel">
        {content[tab]}
      </div>
    </Zone>
  );
}

/** 下方标签页里的一组可拖项；没有内容时不渲染。 */
export function Group({
  label = "",
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  if (Children.count(children) === 0) return null;
  return (
    <section className="py-2 px-3">
      {label && (
        <h3 className="text-base font-medium text-brand-gray mb-2">{label}</h3>
      )}
      <div className="flex flex-wrap gap-1">{children}</div>
    </section>
  );
}
