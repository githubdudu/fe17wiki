import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import InfoTip from "./InfoTip.astro";

describe("InfoTip markup", () => {
  it("renders an accessible popover with its title and content", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(InfoTip, {
      props: { id: "tip-test", label: "战斗类型" },
      slots: { default: "对特定兵种造成额外伤害。" },
    });

    expect(html).toMatchInlineSnapshot(`"<button class="info" type="button" popovertarget="tip-test" aria-label="战斗类型：说明" data-astro-cid-6as2p63z>i</button><div class="tip" id="tip-test" popover data-astro-cid-6as2p63z><p class="title" data-astro-cid-6as2p63z>战斗类型</p><div class="body" data-astro-cid-6as2p63z>对特定兵种造成额外伤害。</div></div>"`);
  });
});