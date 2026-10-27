import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import * as prettier from "prettier";

describe("built classes page snapshots", () => {
  it("matches the full HTML snapshot for the classes page", async (route) => {
    const relativePath = `classes/index.html`;
    const html = await readFile(resolve(process.cwd(), "dist", relativePath), "utf8");
    const formattedHtml = await prettier.format(html, { parser: "html" });

    expect(formattedHtml).toMatchSnapshot();
  });
});