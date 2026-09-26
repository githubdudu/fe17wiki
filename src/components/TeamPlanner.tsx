/**
 * 队伍培养规划：表格下方的「＋」加空行；拖动只负责填表：
 * 下方标签页里的 角色 / 职业 / 纹章士 / 武器 / 刻印 拖进对应的那一列（刻印拖进武器槽）。
 * 表格里的每一项也能拖：拖到别的行的同一列 = 移过去（角色是两行交换），拖回下方 = 清掉；
 * 行首把手拖整行 = 排序；× 删行。
 * 角色、纹章士、刻印在整队里各只能用一次（下方只列没用过的）；职业可重复。
 * 状态存 localStorage；分享链接把状态放在 #t= 里。
 *
 * 拖放用 @dnd-kit/core（鼠标、触屏长按）。本文件只管界面；其余在 ./team/：
 * rules.ts（数据和拖放规则）、dnd.tsx（dnd-kit 接线）、storage.ts（保存 / 分享链接）、exportImage.ts（导出图片）。
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { DndContext, DragOverlay, MouseSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { EMPTY, accepts, drop, type Drag, type Row, type Tab, type Target } from "./team/rules";
import { Draggable, Ghost, Zone, collision, zoneId } from "./team/dnd";
import { load, save, shareLink } from "./team/storage";
import { renderImage } from "./team/exportImage";

type Character = { id: string; name: string; img?: string; initClass: string };
type Named = { name: string; img?: string; group?: string };

const TABS: [Tab, string][] = [
  ["character", "角色"],
  ["class", "职业"],
  ["emblem", "纹章士"],
  ["weapon", "武器"],
  ["engrave", "刻印"],
];

function Avatar({ src, size }: { src?: string; size: number }) {
  return src && <img className="avatar" src={src} alt="" width={size} height={size} draggable={false} />;
}

export default function TeamPlanner({
  characters,
  classes,
  emblems,
}: {
  characters: Character[];
  classes: Named[];
  emblems: Named[];
}) {
  const byId = new Map(characters.map((c) => [c.id, c]));
  const classImg = new Map(classes.map((c) => [c.name, c.img]));
  const emblemImg = new Map(emblems.map((e) => [e.name, e.img]));
  const [rows, setRows] = useState<Row[]>(() => load(new Set(byId.keys())));
  const [tab, setTab] = useState<Tab>("character");
  // 拖动中：拖的是什么、指针在哪个目标上；拖整行时另记各列宽度，残影按原宽度排
  const [dnd, setDnd] = useState<{ drag: Drag; over: string; widths?: number[] } | null>(null);
  const [msg, setMsg] = useState("");
  const tableRef = useRef<HTMLTableElement>(null);
  // 鼠标移动 5px 才算拖（点击照常）；触屏长按 200ms 才拖（不影响滑动页面）
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  useEffect(() => save(rows), [rows]);

  const inTeam = new Set(rows.map((r) => r.id));
  const usedEmblems = new Set(rows.flatMap((r) => r.emblems));
  const usedEngraves = new Set(rows.flatMap((r) => r.weapons.map((w) => w.engrave)));

  /** 高亮提示：能放 = can-drop，指针所在 = over。 */
  const hint = (t: Target) =>
    dnd && accepts(dnd.drag, t) ? (dnd.over === zoneId(t) ? " can-drop over" : " can-drop") : "";
  /** 表头提示：正在拖的东西放进这一列。 */
  const head = (cell: Tab) => (dnd?.drag.kind === cell ? "can-drop" : "");

  const share = async () => {
    const link = shareLink(rows);
    try {
      await navigator.clipboard.writeText(link);
      setMsg("已复制分享链接");
    } catch {
      prompt("复制这个链接：", link);
    }
  };

  // 导出图片：先弹框预览，再选下载或复制到剪贴板
  const previewRef = useRef<HTMLDialogElement>(null);
  const [image, setImage] = useState(""); // png 的 data URL
  const [copyMsg, setCopyMsg] = useState("");
  const openPreview = async () => {
    try {
      setImage(await renderImage(tableRef.current!));
      setCopyMsg("");
      previewRef.current!.showModal();
    } catch {
      setMsg("生成图片失败");
    }
  };
  const copyImage = async () => {
    try {
      // Safari 要求在点击时同步创建 ClipboardItem，所以传 Promise 而不是先 await 出 Blob
      await navigator.clipboard.write([new ClipboardItem({ "image/png": fetch(image).then((r) => r.blob()) })]);
      setCopyMsg("已复制到剪贴板");
    } catch {
      setCopyMsg("复制失败，请用下载");
    }
  };

  /** 小图 + 名字的可拖胶囊（角色、职业、纹章士、刻印）。角色的 value 是 id，显示名字。 */
  const chip = (d: Drag, img?: string, extra = "") => (
    <Draggable key={d.value} d={d} className={`chip ${extra}`}>
      <Avatar src={img} size={22} />
      {d.kind === "character" ? byId.get(d.value)!.name : d.value}
    </Draggable>
  );
  /** 下方标签页里的一组可拖项。 */
  const group = (label: string, list: ReactNode[]) =>
    list.length > 0 && (
      <section key={label}>
        {label && <h3>{label}</h3>}
        <div className="items">{list}</div>
      </section>
    );

  const newWeapon = (
    <Draggable key="tbd" d={{ kind: "weapon", value: "" }} className="chip tbd">
      武器（待定）
    </Draggable>
  );

  const pool: Record<Tab, ReactNode> = {
    character: group(
      "",
      characters.filter((c) => !inTeam.has(c.id)).map((c) => chip({ kind: "character", value: c.id }, c.img)),
    ),
    class: [...Map.groupBy(classes, (c) => c.group ?? "")].map(([g, list]) =>
      group(g, list.map((c) => chip({ kind: "class", value: c.name }, c.img))),
    ),
    emblem: group(
      "",
      emblems.filter((e) => !usedEmblems.has(e.name)).map((e) => chip({ kind: "emblem", value: e.name }, e.img)),
    ),
    weapon: group("", [newWeapon]),
    engrave: group(
      "",
      emblems
        .filter((e) => !usedEngraves.has(e.name))
        .map((e) => chip({ kind: "engrave", value: e.name }, e.img, "engrave")),
    ),
  };

  const weaponSlot = (w: Row["weapons"][number], i: number, k: number) => {
    const slot: Target = { row: i, cell: "engrave", slot: k };
    return (
      <Draggable key={k} d={{ kind: "weapon", value: w.engrave, row: i, slot: k }} className="slot">
        <Zone as="span" t={slot} className={`slot-in${hint(slot)}`}>
          武器（待定）
          {w.engrave ? (
            chip({ kind: "engrave", value: w.engrave, row: i, slot: k }, emblemImg.get(w.engrave), "engrave")
          ) : (
            <span className="hint">无刻印</span>
          )}
        </Zone>
      </Draggable>
    );
  };

  const teamRow = (r: Row, i: number) => {
    const c = byId.get(r.id); // 空行没有角色
    const name = c?.name ?? "空行";
    const t: Target = { row: i };
    const moving = dnd?.drag.kind === "row" && dnd.drag.row === i ? " dragging" : "";
    /** 一列的格子，也是这一列的放置目标。 */
    const cell = (kind: Tab, children: ReactNode) => {
      const ct: Target = { row: i, cell: kind };
      return (
        <Zone as="td" t={ct} className={hint(ct)}>
          {children}
        </Zone>
      );
    };
    return (
      <Zone key={i} as="tr" t={t} className={hint(t) + moving}>
        <td className="grip-cell no-export">
          <Draggable d={{ kind: "row", value: r.id, row: i }} className="grip" label={`拖动整行（${name}）`}>
            <svg width="10" height="16" viewBox="0 0 10 16" aria-hidden="true">
              {[2, 8].flatMap((x) => [3, 8, 13].map((y) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.5" />))}
            </svg>
          </Draggable>
        </td>
        <td className="num">{i + 1}</td>
        <td>
          <input
            className="role"
            value={r.role}
            placeholder="输入定位"
            aria-label={`${name}的定位`}
            onChange={(e) => setRows(rows.with(i, { ...r, role: e.target.value }))}
          />
        </td>
        {cell(
          "character",
          c ? chip({ kind: "character", value: r.id, row: i }, c.img) : <span className="hint">拖入角色</span>,
        )}
        {cell(
          "class",
          r.cls ? chip({ kind: "class", value: r.cls, row: i }, classImg.get(r.cls)) : c && <span className="hint">初始：{c.initClass}</span>,
        )}
        {cell("emblem", <div className="cell">{r.emblems.map((e) => chip({ kind: "emblem", value: e, row: i }, emblemImg.get(e)))}</div>)}
        {cell("weapon", <div className="cell one-line">{r.weapons.map((w, k) => weaponSlot(w, i, k))}</div>)}
        <td className="no-export">
          <button className="x" aria-label={`删除${name}这一行`} onClick={() => setRows(rows.toSpliced(i, 1))}>
            ×
          </button>
        </td>
      </Zone>
    );
  };

  /** 拖动残影：和被拖的那一项长得一样；整行时是按原列宽排的一行表格。 */
  const ghost = (d: Drag) => {
    if (d.kind === "row") {
      const widths = dnd?.widths ?? [];
      return (
        <table className="team ghost" style={{ width: widths.reduce((a, b) => a + b, 0) }}>
          <colgroup>
            {widths.map((w, k) => (
              <col key={k} style={{ width: w }} />
            ))}
          </colgroup>
          <tbody>{teamRow(rows[d.row!], d.row!)}</tbody>
        </table>
      );
    }
    if (d.kind === "weapon" && d.row !== undefined) return weaponSlot(rows[d.row].weapons[d.slot!], d.row, d.slot!);
    if (d.kind === "weapon") return newWeapon;
    const img = { character: byId.get(d.value)?.img, class: classImg.get(d.value), emblem: emblemImg.get(d.value), engrave: emblemImg.get(d.value) }[d.kind];
    return chip(d, img, d.kind === "engrave" ? "engrave" : "");
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={({ active }) => {
        const drag = active.data.current as Drag;
        const tr = drag.kind === "row" ? tableRef.current?.tBodies[0].rows[drag.row!] : undefined;
        setDnd({ drag, over: "", widths: tr && [...tr.cells].map((td) => td.offsetWidth) });
      }}
      onDragOver={({ over }) => setDnd((s) => s && { ...s, over: String(over?.id ?? "") })}
      onDragEnd={({ active, over }) => {
        if (over) setRows((rows) => drop(rows, active.data.current as Drag, over.data.current!.target));
        setDnd(null);
      }}
      onDragCancel={() => setDnd(null)}
    >
      <div className="planner">
        <div className="top">
          <h1>阵容搭配</h1>
          <div className="actions">
            <button onClick={share} disabled={!rows.length}>复制分享链接</button>
            <button onClick={openPreview} disabled={!rows.length}>导出图片</button>
            <button onClick={() => confirm("清空队伍？") && setRows([])} disabled={!rows.length}>清空</button>
            <span className="msg" role="status">{msg}</span>
          </div>
        </div>

        <div className="scroll">
          <table ref={tableRef} className="team">
            <thead>
              <tr>
                <th className="grip-cell no-export" />
                <th className="num">序号</th>
                <th>定位</th>
                <th className={head("character")}>角色</th>
                <th className={head("class")}>职业</th>
                <th className={head("emblem")}>纹章士</th>
                <th className={head("weapon")}>武器 · 刻印</th>
                <th className="no-export" />
              </tr>
            </thead>
            <tbody>{rows.map(teamRow)}</tbody>
          </table>
        </div>
        <button className="add-row" aria-label="加一行" onClick={() => setRows([...rows, EMPTY])}>
          ＋
        </button>

        <Zone as="div" t="pool" className={`pool${hint("pool")}`}>
          <div className="tabs" role="tablist">
            {TABS.map(([k, label]) => (
              <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
                {label}
              </button>
            ))}
            <span className="hint">表格里的项拖回这里即清掉</span>
          </div>
          <div className="panel" role="tabpanel">
            {pool[tab]}
          </div>
        </Zone>

        {/* 放下后被拖的元素常会消失（离开标签页 / 换到别处），不做回弹动画 */}
        <DragOverlay dropAnimation={null}>
          {dnd && <Ghost.Provider value={true}>{ghost(dnd.drag)}</Ghost.Provider>}
        </DragOverlay>

        {/* 导出预览；点遮罩或按 Esc 关闭 */}
        <dialog
          ref={previewRef}
          className="preview"
          aria-label="导出图片"
          onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
        >
          <img src={image} alt="火焰文章结合阵容搭配图片预览" />
          <div className="actions preview-actions">
            <span className="msg" role="status">{copyMsg}</span>
            <a href={image} download="火焰文章结合阵容搭配.png">下载</a>
            <button onClick={copyImage}>复制到剪贴板</button>
            <button onClick={() => previewRef.current!.close()}>关闭</button>
          </div>
        </dialog>
      </div>
    </DndContext>
  );
}
