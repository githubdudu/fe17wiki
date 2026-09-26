/**
 * 和 dnd-kit 打交道的部分：可拖项 Draggable、放置目标 Zone、碰撞检测。
 * 碰撞检测只考虑 accepts 通过的目标；页面上的高亮提示也用 accepts，所以两者永远一致。
 */
import { createContext, createElement, useContext, type ReactNode } from "react";
import { pointerWithin, useDraggable, useDroppable, type CollisionDetection } from "@dnd-kit/core";
import { accepts, type Drag, type Target } from "./rules";

const dragId = (d: Drag) => `${d.kind}:${d.value}:${d.row ?? ""}:${d.slot ?? ""}`;
export const zoneId = (t: Target) => (typeof t === "string" ? t : `${t.row}.${t.cell ?? ""}.${t.slot ?? ""}`);

/** 碰撞检测：只在接受这次拖动的目标里找指针所在的那个。 */
export const collision: CollisionDetection = (args) => {
  const d = args.active.data.current as Drag;
  const droppableContainers = args.droppableContainers.filter((c) => accepts(d, c.data.current!.target));
  return pointerWithin({ ...args, droppableContainers });
};

/** 为 true 时（拖动残影里）可拖项和放置目标只渲染外观，不注册到 dnd-kit。 */
export const Ghost = createContext(false);

type DraggableProps = { d: Drag; className: string; onClick?: () => void; label?: string; children: ReactNode };

export function Draggable(props: DraggableProps) {
  return useContext(Ghost) ? (
    <span className={`item ${props.className}`}>{props.children}</span>
  ) : (
    <LiveDraggable {...props} />
  );
}
function LiveDraggable({ d, className, onClick, label, children }: DraggableProps) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({ id: dragId(d), data: d });
  return (
    <span
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`item ${className}${isDragging ? " dragging" : ""}`}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </span>
  );
}

type ZoneProps = { as: "tr" | "td" | "span" | "div"; t: Target; className: string; children: ReactNode };

export function Zone(props: ZoneProps) {
  return useContext(Ghost) ? createElement(props.as, { className: props.className }, props.children) : <LiveZone {...props} />;
}
function LiveZone({ as, t, className, children }: ZoneProps) {
  const { setNodeRef } = useDroppable({ id: zoneId(t), data: { target: t } });
  return createElement(as, { ref: setNodeRef, className }, children);
}
