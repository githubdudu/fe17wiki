import { type RefObject, useRef, useState } from "react";
import { renderImage } from "./exportImage";

/** 「导出图片」按钮和预览弹框：先弹框预览，再选下载或复制到剪贴板；点遮罩或按 Esc 关闭。 */
export function ExportImage({
  tableRef,
  disabled,
  onError,
}: {
  tableRef: RefObject<HTMLTableElement | null>;
  disabled: boolean;
  onError: (msg: string) => void;
}) {
  const previewRef = useRef<HTMLDialogElement>(null);
  const [image, setImage] = useState(""); // png 的 data URL
  const [copyMsg, setCopyMsg] = useState("");
  const openPreview = async () => {
    try {
      setImage(await renderImage(tableRef.current!));
      setCopyMsg("");
      previewRef.current!.showModal();
    } catch {
      onError("生成图片失败");
    }
  };
  const copyImage = async () => {
    try {
      // Safari 要求在点击时同步创建 ClipboardItem，所以传 Promise 而不是先 await 出 Blob
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": fetch(image).then((r) => r.blob()) }),
      ]);
      setCopyMsg("已复制到剪贴板");
    } catch {
      setCopyMsg("复制失败，请用下载");
    }
  };
  return (
    <>
      <button onClick={openPreview} disabled={disabled}>
        导出图片
      </button>
      <dialog
        ref={previewRef}
        className="mx-auto my-0 max-w-[min(90vw,760px)] rounded-md p-4 shadow-lg backdrop:bg-brand-black/15"
        aria-label="导出图片"
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
      >
        <img
          className="mx-auto block max-h-[60vh] max-w-full border border-brand-border"
          src={image}
          alt="火焰文章结合阵容搭配图片预览"
        />
        <div
          className="actions flex flex-wrap gap-2 m-2 text-brand-blue text-xs [&_:is(button,a)]:cursor-pointer [&_:is(button,a):hover:not(:disabled)]:underline [&_button:disabled]:cursor-not-allowed [&_button:disabled]:text-brand-gray/50 "
          role="toolbar"
        >
          <a href={image} download="fe17wiki_阵容搭配.png">
            下载
          </a>
          <button onClick={copyImage}>复制到剪贴板</button>
          <button onClick={() => previewRef.current!.close()}>关闭</button>
          <span className="text-brand-gray" role="status">
            {copyMsg}
          </span>
        </div>
      </dialog>
    </>
  );
}
