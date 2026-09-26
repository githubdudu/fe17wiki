/** 队伍的保存（localStorage）和分享链接（#t=）。 */
import type { Row } from "./rules";

const KEY = "team-planner";

/** 读取链接里的队伍（优先）或本地保存；链接来自别人，逐项整理后再用。ids = 有效的角色 id。 */
export function load(ids: Set<string>): Row[] {
  try {
    let raw = localStorage.getItem(KEY);
    if (location.hash.startsWith("#t=")) {
      raw = decodeURIComponent(location.hash.slice(3));
      // 去掉 hash，之后的修改存 localStorage，刷新不会被链接里的旧状态覆盖。
      history.replaceState(null, "", location.pathname);
    }
    const rows: unknown = JSON.parse(raw ?? "[]");
    if (!Array.isArray(rows)) return [];
    const strs = (a: unknown) => (Array.isArray(a) ? a.filter((x) => typeof x === "string") : []);
    return rows
      .filter((r, i) => r?.id === "" || (ids.has(r?.id) && rows.findIndex((x) => x?.id === r.id) === i))
      .map((r) => ({
        id: r.id,
        role: typeof r.role === "string" ? r.role : "",
        cls: typeof r.cls === "string" ? r.cls : "",
        emblems: strs(r.emblems),
        weapons: (Array.isArray(r.weapons) ? r.weapons : []).map((w: any) => ({
          engrave: typeof w?.engrave === "string" ? w.engrave : "",
        })),
      }));
  } catch {
    return [];
  }
}

export function save(rows: Row[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(rows));
  } catch {}
}

export const shareLink = (rows: Row[]) =>
  `${location.origin}${location.pathname}#t=${encodeURIComponent(JSON.stringify(rows))}`;
