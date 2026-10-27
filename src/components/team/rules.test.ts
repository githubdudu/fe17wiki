import { describe, expect, it } from "vitest";
import { accepts, drop, EMPTY, take, type Row } from "./rules";

const rows: Row[] = [
  {
    id: "Alear",
    role: "Front",
    cls: "Dragon Child",
    emblems: ["Marth"],
    weapons: [{ engrave: "Marth" }],
  },
  { ...EMPTY, emblems: [], weapons: [] },
];

describe("team drag-and-drop rules", () => {
  it("only accepts matching cells and allows table items back into the pool", () => {
    expect(accepts({ kind: "class", value: "Hero" }, { row: 1, cell: "class" })).toBe(true);
    expect(accepts({ kind: "class", value: "Hero" }, { row: 1, cell: "character" })).toBe(false);
    expect(accepts({ kind: "class", value: "Hero", row: 0 }, "pool")).toBe(true);
    expect(accepts({ kind: "row", value: "Alear", row: 0 }, "pool")).toBe(false);
  });

  it("removes a moved emblem from its source row", () => {
    const result = take(rows, { kind: "emblem", value: "Marth", row: 0 });

    expect(result[0].emblems).toEqual([]);
    expect(result[0].id).toBe("Alear");
    expect(rows[0].emblems).toEqual(["Marth"]);
  });

  it("moves an emblem to another row without duplicating it", () => {
    const result = drop(rows, { kind: "emblem", value: "Marth", row: 0 }, { row: 1, cell: "emblem" });

    expect(result[0].emblems).toEqual([]);
    expect(result[1].emblems).toEqual(["Marth"]);
  });

  it("rejects an emblem already assigned to a different row", () => {
    expect(drop(rows, { kind: "emblem", value: "Marth" }, { row: 1, cell: "emblem" })).toBe(rows);
  });
});