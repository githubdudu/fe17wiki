/** 把队伍表格画成 png（data URL）。带 no-export 的元素（把手、删除按钮）不进图片。 */
import { toCanvas } from "html-to-image";

export async function renderImage(table: HTMLTableElement): Promise<string> {
  // 高分屏（缩放 125%/150%）下边框按设备像素取整，截图里每行会比页面上高零点几像素，
  // 行多了最后一行就被截掉。所以画布按每行 1px 多留高度、表格保持自然高度，画完再裁掉底部空白。
  const canvas = await toCanvas(table, {
    backgroundColor: "#fff",
    height: table.offsetHeight + table.rows.length,
    style: { height: "auto" },
    filter: (n) => !(n instanceof HTMLElement && n.classList.contains("no-export")),
  });
  return trimBottom(canvas).toDataURL("image/png");
}

/** 裁掉画布底部的空白（白色）行。 */
function trimBottom(c: HTMLCanvasElement): HTMLCanvasElement {
  const { data } = c.getContext("2d")!.getImageData(0, 0, c.width, c.height);
  const blank = (y: number) => {
    for (let i = y * c.width * 4; i < (y + 1) * c.width * 4; i += 4)
      if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) return false;
    return true;
  };
  let h = c.height;
  while (h > 1 && blank(h - 1)) h--;
  const out = document.createElement("canvas");
  out.width = c.width;
  out.height = h;
  out.getContext("2d")!.drawImage(c, 0, 0);
  return out;
}
