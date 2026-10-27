import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import * as prettier from "prettier";

import InfoTip from "../components/InfoTip.astro";

describe("InfoTip markup", () => {
  it("renders an accessible popover with its title and content", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderComponent(InfoTip, {
      props: { id: "tip-test", label: "战斗类型" },
      slots: { default: "对特定兵种造成额外伤害。" },
    });

    const formattedHtml = await prettier.format(html, { parser: "html" });

    expect(formattedHtml).toMatchSnapshot();
  });
});