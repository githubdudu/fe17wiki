/**
 * 队伍培养规划：表格下方的「＋」加空行；拖动只负责填表：
 * 下方标签页里的 角色 / 职业 / 纹章士 / 武器 / 刻印 拖进对应的那一列（刻印拖进武器槽）。
 * 表格里的每一项也能拖：拖到别的行的同一列 = 移过去（角色是两行交换），拖回下方 = 清掉；
 * 行首把手拖整行 = 排序；× 删行。
 * 角色、纹章士、刻印在整队里各只能用一次（下方只列没用过的）；职业可重复。
 * 状态存 localStorage；分享链接把压缩后的队伍放在 #s= 里（见 ./team/storage.ts）。
 *
 * 拖放用 @dnd-kit/core（鼠标、触屏长按）。本文件只管界面；其余在 ./team/：
 * rules.ts（数据和拖放规则）、dnd.tsx（dnd-kit 接线）、storage.ts（保存 / 分享链接）、exportImage.ts（导出图片）。
 */
import {
  Children,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  EMPTY,
  accepts,
  drop,
  type Drag,
  type Kind,
  type Row,
  type Tab,
  type Target,
} from "./team/rules";
import { Draggable, Ghost, Zone, collision, zoneId } from "./team/dnd";
import { Chip } from "./team/Chip";
import { load, loadLink, save, shareLink } from "./team/storage";
import { renderImage } from "./team/exportImage";

type Character = { id: string; name: string; img?: string; initClass: string };
type Named = { name: string; img?: string; group?: string };

const KIND_CLASSES: Record<Kind | "pool", string> = {
  character: "kind-character",
  class: "kind-class",
  emblem: "kind-emblem",
  weapon: "kind-weapon",
  engrave: "kind-weapon",
  row: "kind-row",
  pool: "kind-pool",
};

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
  // 拖动中：拖的是什么、指针在哪个目标上；拖整行时另记各列宽度，残影按原宽度排
  const [dnd, setDnd] = useState<{
    drag: Drag;
    over: string;
    widths?: number[];
  } | null>(null);
  const [msg, setMsg] = useState("");
  const tableRef = useRef<HTMLTableElement>(null);
  // 鼠标移动 5px 才算拖（点击照常）；触屏长按 200ms 才拖（不影响滑动页面）
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
  );

  useEffect(() => save(rows), [rows]);
  // 分享链接里的序号按 CSV 行序对应到 id / 名字
  const dict = {
    chars: characters.map((c) => c.id),
    classes: classes.map((c) => c.name),
    emblems: emblems.map((e) => e.name),
  };
  // 打开的是分享链接：解压是异步的，先显示本地保存，读完再换成链接里的队伍
  useEffect(() => {
    loadLink(dict).then((r) => r && setRows(r));
  }, []);

  const DROP_HINT_STYLE: Record<string, string> = {
    "character-drop-can":
      "outline-2 -outline-offset-2 outline-dashed outline-kind-character/55 bg-kind-character/8",
    "character-drop-over":
      "outline-2 outline-kind-character bg-kind-character/22",
    "class-drop-can":
      "outline-2 -outline-offset-2 outline-dashed outline-kind-class/55 bg-kind-class/8",
    "class-drop-over": "outline-2 outline-kind-class bg-kind-class/22",
    "emblem-drop-can":
      "outline-2 -outline-offset-2 outline-dashed outline-kind-emblem/55 bg-kind-emblem/8",
    "emblem-drop-over": "outline-2 outline-kind-emblem bg-kind-emblem/22",
    "weapon-drop-can":
      "outline-2 -outline-offset-2 outline-dashed outline-kind-weapon/55 bg-kind-weapon/8",
    "weapon-drop-over": "outline-2 outline-kind-weapon bg-kind-weapon/22",
    "engrave-drop-can":
      "outline-2 -outline-offset-2 outline-dashed outline-kind-engrave/55 bg-kind-engrave/8",
    "engrave-drop-over": "outline-2 outline-kind-engrave bg-kind-engrave/22",
    "row-drop-can":
      "outline-2 -outline-offset-2 outline-dashed outline-kind-row/55 bg-kind-row/8",
    "row-drop-over": "outline-2 outline-kind-row bg-kind-row/22",
  };
  /** 高亮提示：能放 = can-drop，指针所在 = over。 */
  const hint = (t: Target) => {
    if (!dnd || !accepts(dnd.drag, t)) return "";
    const can_drop = dnd.over === zoneId(t) ? "drop-over" : "drop-can";

    const drop_hint_style_key = `${dnd.drag.kind}-${can_drop}`;
    return DROP_HINT_STYLE[drop_hint_style_key] ?? "";
  };
  /** 表头提示：正在拖的东西放进这一列。 */
  const head = (cell: Tab) => (dnd?.drag.kind === cell ? "drop-can" : "");

  const share = async () => {
    const link = await shareLink(rows, dict);
    try {
      await navigator.clipboard.writeText(link);
      setMsg("已复制分享链接");
    } catch {
      prompt("复制这个链接：", link);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={({ active }) => {
        const drag = active.data.current as Drag;
        const tr =
          drag.kind === "row"
            ? tableRef.current?.tBodies[0].rows[drag.row!]
            : undefined;
        setDnd({
          drag,
          over: "",
          widths: tr && [...tr.cells].map((td) => td.offsetWidth),
        });
      }}
      onDragOver={({ over }) =>
        setDnd((s) => s && { ...s, over: String(over?.id ?? "") })
      }
      onDragEnd={({ active, over }) => {
        if (over)
          setRows((rows) =>
            drop(rows, active.data.current as Drag, over.data.current!.target),
          );
        setDnd(null);
      }}
      onDragCancel={() => setDnd(null)}
    >
      <div className="planner [--line:#d4dde2]">
        <h1 className="my-4 text-2xl font-bold">阵容搭配</h1>
        <div
          className="flex flex-wrap gap-2 mb-2 text-brand-blue text-xs [&_:is(button,a)]:cursor-pointer [&_:is(button,a):hover:not(:disabled)]:underline [&_button:disabled]:cursor-not-allowed [&_button:disabled]:text-brand-gray/50 "
          role="toolbar"
        >
          <button onClick={share} disabled={!rows.length}>
            复制分享链接
          </button>
          <ExportImage
            tableRef={tableRef}
            disabled={!rows.length}
            onError={setMsg}
          />
          <button
            onClick={() => confirm("清空队伍？") && setRows([])}
            disabled={!rows.length}
          >
            清空
          </button>
          <span className="text-brand-gray" role="status">
            {msg}
          </span>
        </div>

        <main className="overflow-x-auto">
          <table
            ref={tableRef}
            className="team w-full border-collapse [&_th]:text-left [&_th]:text-sm [&_th]:text-brand-gray [&_th]:bg-brand-lightblue [&_th,&_td]:border [&_th,&_td]:border-brand-border [&_th]:px-3 [&_th]:py-2 [&_td]:px-2 [&_td]:py-1"
          >
            <thead>
              <tr>
                <th className="w-1 px-1 border-none! bg-white! no-export" />
                <th className="whitespace-nowrap">序号</th>
                <th>定位</th>
                <th
                  className={`kind-character inset-shadow-[0_-3px] inset-shadow-kind-character ${head("character")}`}
                >
                  角色
                </th>
                <th
                  className={`kind-class inset-shadow-[0_-3px] inset-shadow-kind-class ${head("class")}`}
                >
                  职业
                </th>
                <th
                  className={`kind-emblem inset-shadow-[0_-3px] inset-shadow-kind-emblem ${head("emblem")}`}
                >
                  纹章士
                </th>
                <th
                  className={`kind-weapon inset-shadow-[0_-3px] inset-shadow-kind-weapon ${head("weapon")}`}
                >
                  武器 · 刻印
                </th>
                <th className="no-export border-none bg-transparent!" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <TeamRow
                  key={i}
                  row={r}
                  index={i}
                  character={byId.get(r.id)}
                  classImg={classImg}
                  emblemImg={emblemImg}
                  hint={hint}
                  dragging={dnd?.drag.kind === "row" && dnd.drag.row === i}
                  onChange={(next) => setRows(rows.with(i, next))}
                  onRemove={() => setRows(rows.toSpliced(i, 1))}
                />
              ))}
            </tbody>
          </table>
          <button
            className="block w-full border border-brand-border rounded-md text-2xl cursor-pointer mt-2 text-brand-gray hover:text-brand-black hover:border-brand-black"
            title="增加一个角色"
            aria-label="增加一个角色"
            onClick={() => setRows([...rows, EMPTY])}
          >
            ＋
          </button>
        </main>

        <Pool
          characters={characters}
          classes={classes}
          emblems={emblems}
          rows={rows}
          hint={hint("pool")}
        />

        {/* 放下后被拖的元素常会消失（离开标签页 / 换到别处），不做回弹动画 */}
        <DragOverlay dropAnimation={null}>
          {dnd && (
            <Ghost.Provider value={true}>
              <DragGhost
                drag={dnd.drag}
                widths={dnd.widths}
                rows={rows}
                byId={byId}
                classImg={classImg}
                emblemImg={emblemImg}
                hint={hint}
              />
            </Ghost.Provider>
          )}
        </DragOverlay>
      </div>
    </DndContext>
  );
}

/** 「导出图片」按钮和预览弹框：先弹框预览，再选下载或复制到剪贴板；点遮罩或按 Esc 关闭。 */
function ExportImage({
  tableRef,
  disabled,
  onError,
}: {
  tableRef: RefObject<HTMLTableElement | null>;
  disabled: boolean;
  onError: (msg: string) => void;
}) {
  const previewRef = useRef<HTMLDialogElement>(null);
  const [image, setImage] = useState(""); // png 的 data URL
  const [copyMsg, setCopyMsg] = useState("");
  const openPreview = async () => {
    try {
      setImage(await renderImage(tableRef.current!));
      setCopyMsg("");
      previewRef.current!.showModal();
    } catch {
      onError("生成图片失败");
    }
  };
  const copyImage = async () => {
    try {
      // Safari 要求在点击时同步创建 ClipboardItem，所以传 Promise 而不是先 await 出 Blob
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": fetch(image).then((r) => r.blob()) }),
      ]);
      setCopyMsg("已复制到剪贴板");
    } catch {
      setCopyMsg("复制失败，请用下载");
    }
  };
  return (
    <>
      <button onClick={openPreview} disabled={disabled}>
        导出图片
      </button>
      <dialog
        ref={previewRef}
        className="mx-auto my-0 max-w-[min(90vw,760px)] rounded-md p-4 shadow-lg backdrop:bg-brand-black/15"
        aria-label="导出图片"
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
      >
        <img
          className="mx-auto block max-h-[60vh] max-w-full border border-brand-border"
          src={image}
          alt="火焰文章结合阵容搭配图片预览"
        />
        <div
          className="actions flex flex-wrap gap-2 m-2 text-brand-blue text-xs [&_:is(button,a)]:cursor-pointer [&_:is(button,a):hover:not(:disabled)]:underline [&_button:disabled]:cursor-not-allowed [&_button:disabled]:text-brand-gray/50 "
          role="toolbar"
        >
          <a href={image} download="火焰文章结合阵容搭配.png">
            下载
          </a>
          <button onClick={copyImage}>复制到剪贴板</button>
          <button onClick={() => previewRef.current!.close()}>关闭</button>
          <span className="text-brand-gray" role="status">
            {copyMsg}
          </span>
        </div>
      </dialog>
    </>
  );
}

/** 下方的标签页：列出还没用过的可拖项，也是「拖回清掉」的目标。hint 是拖动时的高亮类名。 */
function Pool({
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
    character: (
      <Group>
        {characters
          .filter((c) => !inTeam.has(c.id))
          .map((c) => (
            <Chip
              key={c.id}
              d={{ kind: "character", value: c.id }}
              img={c.img}
              label={c.name}
            />
          ))}
      </Group>
    ),
    class: [...Map.groupBy(classes, (c) => c.group ?? "")].map(([g, list]) => (
      <Group key={g} label={g}>
        {list.map((c) => (
          <Chip key={c.name} d={{ kind: "class", value: c.name }} img={c.img} />
        ))}
      </Group>
    )),
    emblem: (
      <Group>
        {emblems
          .filter((e) => !usedEmblems.has(e.name))
          .map((e) => (
            <Chip
              key={e.name}
              d={{ kind: "emblem", value: e.name }}
              img={e.img}
            />
          ))}
      </Group>
    ),
    weapon: (
      <Group>
        {/* 武器的 value 是它带的刻印，新武器没有刻印 */}
        <Chip d={{ kind: "weapon", value: "" }} label="武器待定" />
      </Group>
    ),
    engrave: (
      <Group>
        {emblems
          .filter((e) => !usedEngraves.has(e.name))
          .map((e) => (
            <Chip
              key={e.name}
              d={{ kind: "engrave", value: e.name }}
              img={e.img}
            />
          ))}
      </Group>
    ),
  };
  return (
    <Zone as="div" t="pool" className={`mt-4 border border-brand-border ${hint}`}>
      <div className="flex flex-wrap items-center bg-brand-lightblue border-b border-brand-border" role="tablist">
        <button
          role="tab"
          className={`px-[0.9rem] py-2 border-0 text-brand-gray cursor-pointer hover:text-[#262a3f] kind-character hover:bg-kind-character/22 bg-kind-character/8 ${tab === "character" ? "font-bold text-[#262a3f] inset-shadow-[0_-3px] inset-shadow-kind-character" : ""}`}
          aria-selected={tab === "character"}
          onClick={() => setTab("character")}
        >
          角色
        </button>
        <button
          role="tab"
          className={`px-[0.9rem] py-2 border-0 text-brand-gray cursor-pointer hover:text-[#262a3f] kind-class hover:bg-kind-class/22 bg-kind-class/8 ${tab === "class" ? "font-bold text-[#262a3f] inset-shadow-[0_-3px] inset-shadow-kind-class" : ""}`}
          aria-selected={tab === "class"}
          onClick={() => setTab("class")}
        >
          职业
        </button>
        <button
          role="tab"
          className={`px-[0.9rem] py-2 border-0 text-brand-gray cursor-pointer hover:text-[#262a3f] kind-emblem hover:bg-kind-emblem/22 bg-kind-emblem/8 ${tab === "emblem" ? "font-bold text-[#262a3f] inset-shadow-[0_-3px] inset-shadow-kind-emblem" : ""}`}
          aria-selected={tab === "emblem"}
          onClick={() => setTab("emblem")}
        >
          纹章士
        </button>
        <button
          role="tab"
          className={`px-[0.9rem] py-2 border-0 text-brand-gray cursor-pointer hover:text-[#262a3f] kind-weapon hover:bg-kind-weapon/22 bg-kind-weapon/8 ${tab === "weapon" ? "font-bold text-[#262a3f] inset-shadow-[0_-3px] inset-shadow-kind-weapon" : ""}`}
          aria-selected={tab === "weapon"}
          onClick={() => setTab("weapon")}
        >
          武器
        </button>
        <button
          role="tab"
          className={`px-[0.9rem] py-2 border-0 text-brand-gray cursor-pointer hover:text-[#262a3f] kind-weapon hover:bg-kind-weapon/40 bg-kind-weapon/22 ${tab === "engrave" ? "font-bold text-[#262a3f] inset-shadow-[0_-3px] inset-shadow-kind-weapon" : ""}`}
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
function Group({
  label = "",
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  if (Children.count(children) === 0) return null;
  return (
    <section className="py-2 px-3">
      {label && <h3 className="text-base font-medium text-brand-gray mb-2">{label}</h3>}
      <div className="flex flex-wrap gap-1">{children}</div>
    </section>
  );
}

/** 表格里的一个武器槽：可拖，也是刻印的放置目标。hint 是拖动时的高亮类名。 */
function WeaponSlot({
  engrave,
  row,
  slot,
  hint,
  img,
}: {
  engrave: string;
  row: number;
  slot: number;
  hint: string;
  img?: string;
}) {
  return (
    <Draggable
      d={{ kind: "weapon", value: engrave, row, slot }}
      className="inline-flex"
    >
      <Zone
        as="span"
        t={{ row, cell: "engrave", slot }}
        className={`slot-in inline-flex items-center gap-2 ps-2 rounded-md text-base whitespace-nowrap border border-kind-weapon ${hint}`}
      >
        武器（待定）
        {engrave ? (
          <Chip d={{ kind: "engrave", value: engrave, row, slot }} img={img} />
        ) : (
          <span className="text-brand-gray/70 text-xs">无刻印</span>
        )}
      </Zone>
    </Draggable>
  );
}

/** 一列的格子，也是这一列的放置目标。 */
function Cell({
  row,
  kind,
  className,
  children,
}: {
  row: number;
  kind: Tab;
  className?: string;
  children: ReactNode;
}) {
  const t: Target = { row, cell: kind };
  return (
    <Zone as="td" t={t} className={`${className ?? ""}`}>
      {children}
    </Zone>
  );
}

/** 表格里的一行。空行没有 character。 */
function TeamRow({
  row: r,
  index: i,
  character: c,
  classImg,
  emblemImg,
  hint,
  dragging,
  onChange,
  onRemove,
}: {
  row: Row;
  index: number;
  character?: Character;
  classImg: Map<string, string | undefined>;
  emblemImg: Map<string, string | undefined>;
  hint: (t: Target) => string;
  dragging?: boolean;
  onChange: (row: Row) => void;
  onRemove: () => void;
}) {
  const name = c?.name ?? "空行";
  const t: Target = { row: i };
  return (
    // Original row being dragged will have reduced opacity
    <Zone as="tr" t={t} className={hint(t) + (dragging ? " opacity-40" : "")}>
      <td className="w-1 px-1 border-none bg-white no-export">
        <Draggable
          d={{ kind: "row", value: r.id, row: i }}
          className="grid hover:bg-brand-hover hover:fill-brand-black place-items-center w-5 h-5 fill-brand-gray"
          label={`拖动整行（${name}）`}
        >
          <svg width="10" height="16" viewBox="0 0 10 16" aria-hidden="true">
            {[2, 8].flatMap((x) =>
              [3, 8, 13].map((y) => (
                <circle key={`${x}${y}`} cx={x} cy={y} r="1.5" />
              )),
            )}
          </svg>
        </Draggable>
      </td>
      <td
        className="text-brand-gray/70 text-sm text-center whitespace-nowrap"
        title="序号"
      >
        {i + 1}
      </td>
      <td title="角色定位">
        <input
          className="w-[7em] px-1 border border-transparent rounded bg-transparent [font:inherit] text-base hover:border-brand-border focus:border-brand-black focus:outline-none"
          value={r.role}
          placeholder="输入定位"
          aria-label={`${name}的定位`}
          onChange={(e) => onChange({ ...r, role: e.target.value })}
        />
      </td>
      <Cell
        row={i}
        kind="character"
        className={hint({ row: i, cell: "character" })}
      >
        {c ? (
          <Chip
            d={{ kind: "character", value: r.id, row: i }}
            img={c.img}
            label={c.name}
          />
        ) : (
          <span className="text-brand-gray/70 text-xs">拖入角色</span>
        )}
      </Cell>
      <Cell row={i} kind="class" className={hint({ row: i, cell: "class" })}>
        {r.cls ? (
          <Chip
            d={{ kind: "class", value: r.cls, row: i }}
            img={classImg.get(r.cls)}
          />
        ) : (
          c && (
            <span className="text-brand-gray/70 text-xs">
              初始：{c.initClass}
            </span>
          )
        )}
      </Cell>
      <Cell row={i} kind="emblem" className={hint({ row: i, cell: "emblem" })}>
        <div className="flex flex-wrap gap-1">
          {r.emblems.map((e) => (
            <Chip
              key={e}
              d={{ kind: "emblem", value: e, row: i }}
              img={emblemImg.get(e)}
            />
          ))}
        </div>
      </Cell>
      <Cell row={i} kind="weapon" className={hint({ row: i, cell: "weapon" })}>
        <div className="flex flex-wrap gap-1">
          {r.weapons.map((w, k) => (
            <WeaponSlot
              key={k}
              engrave={w.engrave}
              row={i}
              slot={k}
              hint={hint({ row: i, cell: "engrave", slot: k })}
              img={emblemImg.get(w.engrave)}
            />
          ))}
        </div>
      </Cell>
      <td className="no-export w-6 p-0 text-center align-middle  border-none">
        <button
          className="inline-grid size-6 align-middle cursor-pointer place-items-center hover:text-brand-black hover:bg-brand-hover text-brand-gray"
          aria-label={`删除${name}这一行`}
          onClick={onRemove}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="m4 4 8 8M12 4l-8 8" />
          </svg>
        </button>
      </td>
    </Zone>
  );
}

/** 拖动残影：和被拖的那一项长得一样；整行时是按原列宽排的一行表格。 */
function DragGhost({
  drag: d,
  widths = [],
  rows,
  byId,
  classImg,
  emblemImg,
  hint,
}: {
  drag: Drag;
  widths?: number[];
  rows: Row[];
  byId: Map<string, Character>;
  classImg: Map<string, string | undefined>;
  emblemImg: Map<string, string | undefined>;
  hint: (t: Target) => string;
}) {
  if (d.kind === "row") {
    const r = rows[d.row!];
    return (
      <table
        className="team table-fixed shadow-md [&_tr]:outline-none [&_tr]:bg-white"
        style={{ width: widths.reduce((a, b) => a + b, 0) }}
      >
        <colgroup>
          {widths.map((w, k) => (
            <col key={k} style={{ width: w }} />
          ))}
        </colgroup>
        <tbody>
          <TeamRow
            row={r}
            index={d.row!}
            character={byId.get(r.id)}
            classImg={classImg}
            emblemImg={emblemImg}
            hint={hint}
            onChange={() => {}}
            onRemove={() => {}}
          />
        </tbody>
      </table>
    );
  }
  if (d.kind === "weapon") {
    // 武器槽不接受武器，所以残影里没有高亮
    return d.row === undefined ? (
      <Chip d={{ kind: "weapon", value: "" }} label="武器待定" />
    ) : (
      <WeaponSlot
        engrave={d.value}
        row={d.row}
        slot={d.slot!}
        hint=""
        img={emblemImg.get(d.value)}
      />
    );
  }
  const img =
    d.kind === "character"
      ? byId.get(d.value)?.img
      : d.kind === "class"
        ? classImg.get(d.value)
        : emblemImg.get(d.value);
  const label = d.kind === "character" ? byId.get(d.value)?.name : undefined;
  return <Chip d={d} img={img} label={label} />;
}
