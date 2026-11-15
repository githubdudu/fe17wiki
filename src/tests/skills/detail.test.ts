import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import * as prettier from "prettier";

describe("built skill detail page snapshots", () => {
  it.each([
    ["个人特技", "神龙团结"],
    ["个人特技", "战之血"],
    ["兵种特技", "月光"],
    ["兵种特技", "背理之法"],
    ["纹章士-同步特技", "再移动"],
    ["纹章士-同步特技", "身体接触"],
    ["纹章士-继承特技", "速度+3"],
    ["纹章士-继承特技", "回避+30"],
    ["纹章士-结合特技", "神龙加护"],
    ["纹章士-结合特技", "牵绊之盾"],
    ["纹章士-结合指令技", "霸克·天空"],
    ["纹章士-结合指令技", "计策：女神之舞"],
    ["牵绊戒指特技", "神雷"],
    ["牵绊戒指特技", "风神"],
  ])("%s: matches the full HTML snapshot for %s", async (_type, id) => {
    const relativePath = `skills/${id}/index.html`;
    const html = await readFile(resolve(process.cwd(), "dist", relativePath), "utf8");
    const formattedHtml = await prettier.format(html, { parser: "html" });

    expect(formattedHtml).toMatchSnapshot();
  });
});