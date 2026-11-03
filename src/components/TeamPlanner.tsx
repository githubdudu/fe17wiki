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
import { useEffect, useRef, useState } from "react";
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
  type Row,
  type Tab,
  type Target,
} from "./team/rules";
import { Ghost, collision, zoneId } from "./team/dnd";
import { load, loadLink, save, type Dict } from "./team/storage";
import { TeamToolbar } from "./team/TeamToolbar";
import { Pool } from "./team/Pool";
import { DragGhost, TeamTable } from "./team/TeamTable";
import type { Character, Named } from "./team/types";

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
  const dict: Dict = {
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
      <div data-description="Team Planner">
        <h1 className="my-4 text-2xl font-medium">阵容搭配</h1>
        <TeamToolbar
          rows={rows}
          dict={dict}
          tableRef={tableRef}
          onClear={() => setRows([])}
        />

        <TeamTable
          rows={rows}
          tableRef={tableRef}
          byId={byId}
          classImg={classImg}
          emblemImg={emblemImg}
          hint={hint}
          draggingRow={dnd?.drag.kind === "row" ? dnd.drag.row : undefined}
          onRowsChange={setRows}
        />

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
