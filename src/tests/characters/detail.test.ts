import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import * as prettier from "prettier";

describe("built character detail page snapshots", () => {
  it.each(["alear", "clanne", "lapis", "yunaka", "rosado", "ivy", "merrin", "pandreo", "nel"])(
    "matches the full HTML snapshot for %s",
    async (id) => {
      const relativePath = `characters/${id}/index.html`;
    const html = await readFile(resolve(process.cwd(), "dist", relativePath), "utf8");
    const formattedHtml = await prettier.format(html, { parser: "html" });

    expect(formattedHtml).toMatchSnapshot();
    },
  );
});