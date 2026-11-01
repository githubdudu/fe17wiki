import { useState, type RefObject } from "react";
import { ExportImage } from "./ExportImage";
import type { Dict } from "./storage";
import { shareLink } from "./storage";
import type { Row } from "./rules";

export function TeamToolbar({
  rows,
  dict,
  tableRef,
  onClear,
}: {
  rows: Row[];
  dict: Dict;
  tableRef: RefObject<HTMLTableElement | null>;
  onClear: () => void;
}) {
  const [msg, setMsg] = useState("");

  const share = async () => {
    const link = await shareLink(rows, dict);
    try {
      await navigator.clipboard.writeText(link);
      setMsg("已复制分享链接");
    } catch {
      prompt("复制这个链接：", link);
    }
  };

  return (
    <div
      className="flex flex-wrap gap-2 mb-2 text-brand-blue text-xs [&_:is(button,a)]:cursor-pointer [&_:is(button,a):hover:not(:disabled)]:underline [&_button:disabled]:cursor-not-allowed [&_button:disabled]:text-brand-gray/50 "
      role="toolbar"
    >
      <button onClick={share} disabled={!rows.length}>
        复制分享链接
      </button>
      <ExportImage
        tableRef={tableRef}
        disabled={!rows.length}
        onError={setMsg}
      />
      <button
        onClick={() => confirm("清空队伍？") && onClear()}
        disabled={!rows.length}
      >
        清空
      </button>
      <span className="text-brand-gray" role="status">
        {msg}
      </span>
    </div>
  );
}