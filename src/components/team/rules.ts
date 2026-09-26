/**
 * 队伍数据和拖放规则（纯函数，不依赖 React）：
 * accepts（能不能放）、take（从表格里拿掉）、drop（放下后的队伍）。
 */

// id 为空 = 还没拖入角色的空行；role = 手填的定位。武器暂无数据，槽位只记刻印。
export type Row = { id: string; role: string; cls: string; emblems: string[]; weapons: { engrave: string }[] };
export const EMPTY: Row = { id: "", role: "", cls: "", emblems: [], weapons: [] };

export type Tab = "character" | "class" | "emblem" | "weapon" | "engrave";
/** row = 行首把手拖整行；其余同标签页。 */
export type Kind = Tab | "row";
/** 正在拖的东西；row 有值 = 从表格第几行拖出来的，slot = 第几个武器槽。weapon 的 value 是它带的刻印。 */
export type Drag = { kind: Kind; value: string; row?: number; slot?: number };
/**
 * 放到哪：某一行的某一列（cell）、某个武器槽（cell = engrave + slot）、
 * 整行（没有 cell，只给拖整行排序用）、或下方标签页（= 清掉）。
 */
export type Target = { row: number; cell?: Tab; slot?: number } | "pool";

/** 这个目标接不接受这次拖动。 */
export function accepts(d: Drag, t: Target): boolean {
  if (t === "pool") return d.row !== undefined && d.kind !== "row"; // 表格里的项拖回去清掉；删行用 ×
  return t.cell === undefined ? d.kind === "row" : d.kind === t.cell; // 只能放进对应的那一列
}

/** 从表格里拿掉被拖的那一项（从下方拖来的不用拿）。 */
export function take(rows: Row[], d: Drag): Row[] {
  if (d.row === undefined) return rows;
  const r = rows[d.row];
  switch (d.kind) {
    case "row":
      return rows.toSpliced(d.row, 1);
    case "character":
      return rows.with(d.row, { ...r, id: "" });
    case "class":
      return rows.with(d.row, { ...r, cls: "" });
    case "emblem":
      return rows.with(d.row, { ...r, emblems: r.emblems.filter((x) => x !== d.value) });
    case "weapon":
      return rows.with(d.row, { ...r, weapons: r.weapons.toSpliced(d.slot!, 1) });
    case "engrave":
      return rows.with(d.row, { ...r, weapons: r.weapons.with(d.slot!, { engrave: "" }) });
  }
}

/** 放下后的新队伍（先经过 accepts）；违反唯一性就原样返回。 */
export function drop(rows: Row[], d: Drag, t: Target): Row[] {
  if (t === "pool") return take(rows, d);
  const at = t.row;

  if (d.kind === "row") return take(rows, d).toSpliced(at, 0, rows[d.row!]);
  // 表格里的角色 / 职业放到别的行：两行交换（对方是空的就是移过去）
  if ((d.kind === "character" || d.kind === "class") && d.row !== undefined) {
    const f = d.kind === "character" ? "id" : "cls";
    return rows.with(d.row, { ...rows[d.row], [f]: rows[at][f] }).with(at, { ...rows[at], [f]: d.value });
  }
  // 从下方拖来的角色：填入（或替换）这一行的角色
  if (d.kind === "character") return rows.some((r) => r.id === d.value) ? rows : rows.with(at, { ...rows[at], id: d.value });

  const base = take(rows, d); // 表格里拖来的是移动；下方拖来的不用拿
  if (d.kind === "emblem" && base.some((r) => r.emblems.includes(d.value))) return rows;
  if (d.kind === "engrave" && base.some((r) => r.weapons.some((w) => w.engrave === d.value))) return rows;
  const r = base[at];
  switch (d.kind) {
    case "class":
      return base.with(at, { ...r, cls: d.value });
    case "emblem":
      return base.with(at, { ...r, emblems: [...r.emblems, d.value] });
    case "weapon":
      return base.with(at, { ...r, weapons: [...r.weapons, { engrave: d.value }] });
    case "engrave": // accepts 保证刻印的目标是武器槽
      return base.with(at, { ...r, weapons: r.weapons.with(t.slot!, { engrave: d.value }) });
  }
}
