import type { RefObject } from "react";
import { Chip } from "./Chip";
import { Draggable, Ghost, Zone } from "./dnd";
import { EMPTY, type Drag, type Row, type Tab, type Target } from "./rules";
import type { Character } from "./types";

type TeamTableProps = {
  rows: Row[];
  tableRef: RefObject<HTMLTableElement | null>;
  byId: Map<string, Character>;
  classImg: Map<string, string | undefined>;
  emblemImg: Map<string, string | undefined>;
  hint: (target: Target) => string;
  draggingRow?: number;
  onRowsChange: (rows: Row[]) => void;
};

export function TeamTable({
  rows,
  tableRef,
  byId,
  classImg,
  emblemImg,
  hint,
  draggingRow,
  onRowsChange,
}: TeamTableProps) {
  return (
    <main className="overflow-x-auto">
      <table
        ref={tableRef}
        className="w-full border-collapse [&_th]:text-left [&_th]:text-sm [&_th]:text-brand-gray [&_th]:bg-brand-lightblue [&_th,&_td]:border [&_th,&_td]:border-brand-border [&_th]:px-3 [&_th]:py-2 [&_td]:px-2 [&_td]:py-1"
        data-description="Team Table"
      >
        <thead>
          <tr>
            <th className="w-1 px-1 border-none! bg-white! no-export" />
            <th className="whitespace-nowrap">序号</th>
            <th>定位</th>
            <th className={`inset-shadow-[0_-3px] inset-shadow-kind-character`}>
              角色
            </th>
            <th className={`inset-shadow-[0_-3px] inset-shadow-kind-class`}>
              职业
            </th>
            <th className={`inset-shadow-[0_-3px] inset-shadow-kind-emblem`}>
              纹章士
            </th>
            <th className={`inset-shadow-[0_-3px] inset-shadow-kind-weapon`}>
              武器 · 刻印
            </th>
            <th className="no-export border-none bg-transparent!" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <TeamRow
              key={index}
              row={row}
              index={index}
              character={byId.get(row.id)}
              classImg={classImg}
              emblemImg={emblemImg}
              hint={hint}
              dragging={draggingRow === index}
              onChange={(next) => onRowsChange(rows.with(index, next))}
              onRemove={() => onRowsChange(rows.toSpliced(index, 1))}
            />
          ))}
        </tbody>
      </table>
      <button
        className="block w-full border border-brand-border rounded-md text-2xl cursor-pointer mt-2 text-brand-gray hover:text-brand-black hover:border-brand-black"
        title="增加一个角色"
        aria-label="增加一个角色"
        onClick={() => onRowsChange([...rows, EMPTY])}
      >
        ＋
      </button>
    </main>
  );
}

/*
 * The dragged element which moves with the cursor during a drag operation
 *
 * Could be a row, or a capsule (character, class, emblem, weapon)
 */
export function DragGhost({
  drag,
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
  hint: (target: Target) => string;
}) {
  if (drag.kind === "row") {
    const row = rows[drag.row!];
    return (
      <table
        className="table-fixed shadow-md [&_tr]:outline-none [&_tr]:bg-white"
        style={{ width: widths.reduce((total, width) => total + width, 0) }}
        data-description="dragged ghost"
      >
        <colgroup>
          {widths.map((width, index) => (
            <col key={index} style={{ width }} />
          ))}
        </colgroup>
        <tbody>
          <TeamRow
            row={row}
            index={drag.row!}
            character={byId.get(row.id)}
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
  if (drag.kind === "weapon") {
    return drag.row === undefined ? (
      <Chip d={{ kind: "weapon", value: "" }} label="武器待定" />
    ) : (
      <WeaponSlot
        engrave={drag.value}
        row={drag.row}
        slot={drag.slot!}
        hint=""
        img={emblemImg.get(drag.value)}
      />
    );
  }
  const img =
    drag.kind === "character"
      ? byId.get(drag.value)?.img
      : drag.kind === "class"
        ? classImg.get(drag.value)
        : emblemImg.get(drag.value);
  const label =
    drag.kind === "character" ? byId.get(drag.value)?.name : undefined;
  return <Chip d={drag} img={img} label={label} />;
}

/**
 * The capsule of Weapon is special because it includes a engrave slot.
 *
 */
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
        className={`inline-flex items-center gap-2 ps-2 rounded-md text-base whitespace-nowrap border border-kind-weapon ${hint}`}
        data-description="engrave slot inside weapon"
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

/**
 * A cell is a td element that could place a draggable capsule inside.
 */
function Cell({
  row,
  kind,
  className,
  children,
}: {
  row: number;
  kind: Tab;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Zone as="td" t={{ row, cell: kind }} className={className ?? ""}>
      {children}
    </Zone>
  );
}

/**
 * A row in the team table, representing a character and its associated slots.
 *
 * Contains lots of customized color for each column.
 */
function TeamRow({
  row,
  index,
  character,
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
  hint: (target: Target) => string;
  dragging?: boolean;
  onChange: (row: Row) => void;
  onRemove: () => void;
}) {
  const name = character?.name ?? "空行";
  const target: Target = { row: index };
  return (
    <Zone
      as="tr"
      t={target}
      className={hint(target) + (dragging ? " opacity-40" : "")}
    >
      <td className="w-1 px-1 border-none bg-white no-export">
        <Draggable
          d={{ kind: "row", value: row.id, row: index }}
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
        {index + 1}
      </td>
      <td className="text-base" title="角色定位">
        <input
          className="w-[7em] px-1 border border-transparent rounded bg-transparent [font:inherit] text-base hover:border-brand-border focus:border-brand-black focus:outline-none"
          value={row.role}
          placeholder="输入定位"
          aria-label={`${name}的定位`}
          onChange={(event) => onChange({ ...row, role: event.target.value })}
        />
      </td>
      <Cell
        row={index}
        kind="character"
        className={hint({ row: index, cell: "character" })}
      >
        {character ? (
          <Chip
            d={{ kind: "character", value: row.id, row: index }}
            img={character.img}
            label={character.name}
          />
        ) : (
          <span className="text-brand-gray/70 text-xs">拖入角色</span>
        )}
      </Cell>
      <Cell
        row={index}
        kind="class"
        className={hint({ row: index, cell: "class" })}
      >
        {row.cls ? (
          <Chip
            d={{ kind: "class", value: row.cls, row: index }}
            img={classImg.get(row.cls)}
          />
        ) : (
          character && (
            <span className="text-brand-gray/70 text-xs">
              初始：{character.initClass}
            </span>
          )
        )}
      </Cell>
      <Cell
        row={index}
        kind="emblem"
        className={hint({ row: index, cell: "emblem" })}
      >
        <div className="flex flex-wrap gap-1">
          {row.emblems.map((emblem) => (
            <Chip
              key={emblem}
              d={{ kind: "emblem", value: emblem, row: index }}
              img={emblemImg.get(emblem)}
            />
          ))}
        </div>
      </Cell>
      <Cell
        row={index}
        kind="weapon"
        className={hint({ row: index, cell: "weapon" })}
      >
        <div className="flex flex-wrap gap-1">
          {row.weapons.map((weapon, slot) => (
            <WeaponSlot
              key={slot}
              engrave={weapon.engrave}
              row={index}
              slot={slot}
              hint={hint({ row: index, cell: "engrave", slot })}
              img={emblemImg.get(weapon.engrave)}
            />
          ))}
        </div>
      </Cell>
      <td className="no-export w-6 p-0 text-center align-middle border-none">
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
