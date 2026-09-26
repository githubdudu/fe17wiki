/** 队伍的保存（localStorage）和分享链接（#s=）。 */
import type { Row } from "./rules";

const KEY = "team-planner";

/** 链接里用序号代替名字：各列表按 CSV 行序排好，传进来。 */
export type Dict = { chars: string[]; classes: string[]; emblems: string[] };

/** 本地保存的队伍。 */
export function load(ids: Set<string>): Row[] {
  try {
    return normalize(JSON.parse(localStorage.getItem(KEY) ?? "[]"), ids);
  } catch {
    return [];
  }
}

export function save(rows: Row[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(rows));
  } catch {}
}

/**
 * 分享链接：每行存成 [角色, 定位, 职业, [纹章士…], [刻印…]]，角色 / 职业 / 纹章士 / 刻印都用在 CSV 里的序号（-1 = 空），
 * 转 JSON 后用浏览器自带的 deflate 压缩，再转成网址安全的 base64。
 * ponytail: 序号依赖 CSV 行序；只在末尾加行不影响旧链接，中间插行或调序会让旧链接错位（要稳定就给 CSV 加短码列）。
 */
export async function shareLink(rows: Row[], d: Dict) {
  const packed = rows.map((r) => [
    d.chars.indexOf(r.id),
    r.role,
    d.classes.indexOf(r.cls),
    r.emblems.map((e) => d.emblems.indexOf(e)),
    r.weapons.map((w) => d.emblems.indexOf(w.engrave)),
  ]);
  return `${location.origin}${location.pathname}#s=${await zip(JSON.stringify(packed))}`;
}

/** 读取链接里的队伍（没有就返回 null），读完去掉 hash，之后的修改存 localStorage，刷新不会被链接覆盖。 */
export async function loadLink(d: Dict): Promise<Row[] | null> {
  const hash = location.hash;
  if (!hash.startsWith("#s=")) return null;
  history.replaceState(null, "", location.pathname);
  try {
    const packed: unknown = JSON.parse(await unzip(hash.slice(3)));
    if (!Array.isArray(packed)) return null;
    const rows = packed.map((a: any) => ({
      id: d.chars[a?.[0]] ?? "",
      role: a?.[1],
      cls: d.classes[a?.[2]] ?? "",
      emblems: Array.isArray(a?.[3]) ? a[3].map((i: number) => d.emblems[i]) : [],
      weapons: Array.isArray(a?.[4]) ? a[4].map((i: number) => ({ engrave: d.emblems[i] ?? "" })) : [],
    }));
    return normalize(rows, new Set(d.chars));
  } catch {
    return null;
  }
}

/** 数据可能来自别人的链接或旧版本，逐项整理：不认识 / 重复的角色丢掉，类型不对的字段清空。 */
function normalize(rows: unknown, ids: Set<string>): Row[] {
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
}

const pipe = (data: BlobPart, stream: CompressionStream | DecompressionStream) =>
  new Response(new Blob([data]).stream().pipeThrough(stream));

async function zip(text: string) {
  const bytes = new Uint8Array(await pipe(text, new CompressionStream("deflate-raw")).arrayBuffer());
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function unzip(b64: string) {
  const bytes = Uint8Array.from(atob(b64.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
  return pipe(bytes, new DecompressionStream("deflate-raw")).text();
}
