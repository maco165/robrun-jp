// 感度の変換 (tools/sensitivity/)。どのゲームも「感度 1 のとき、マウスの 1 カウントで何度回るか」(yaw、度/カウント) を持ち、
// 回る角度 = yaw × 感度 × カウント数 で比べる。1 インチは 2.54 cm、DPI はマウスが 1 インチで出すカウント数。
// 係数の正本は data/sensitivity.json (出典つき)。FOV で係数が変わるゲームは、その条件を note に書く
export type SensGame = {
  id: string;
  name: string;
  /** 感度 1 のときの度/カウント。分からないゲームは null (変換に使えない) */
  yaw: number | null;
  /** 係数の前提 (ゲーム内の FOV の既定値など)。無ければ空 */
  note?: string;
  sources: { url: string; title: string }[];
};

/** 振り向き (360 度回るのに動かす距離、cm) */
export function cm360(yaw: number, sens: number, dpi: number): number {
  return (360 / (yaw * sens * dpi)) * 2.54;
}

/** 元のゲームと同じ振り向きになる、先のゲームの感度 */
export function convertSens(from: { yaw: number; sens: number; dpi: number }, toYaw: number, toDpi: number): number {
  return (from.yaw * from.sens * from.dpi) / (toYaw * toDpi);
}

/** 自分で測った振り向きから、そのゲームの yaw を逆算する (感度 sens・DPI dpi で 360 度に cm だった) */
export function yawFromMeasure(sens: number, dpi: number, cm: number): number {
  return (360 * 2.54) / (sens * dpi * cm);
}

/** 入力が計算に使える正の有限の数か */
export function positive(...xs: (number | null | undefined)[]): boolean {
  return xs.every((x) => typeof x === 'number' && Number.isFinite(x) && x > 0);
}

type Src = { url: string; title: string };
/** data/sensitivity.json の形 */
export type SensData = {
  checkedAt: string;
  robrun: { yaw: number; default: number; min: number; max: number; note: string; settings: string; sources: Src[] };
  formula: { text: string; sources: Src[] };
  games: { id: string; name: string; yaw: number; note?: string; sources: Src[] }[];
  unsupported: { name: string; reason: string }[];
  measure: string[];
};

/** 係数の表の検査: どのゲームも正の yaw と https の出典を持ち、id が重ならない */
export function checkSens(d: SensData): string[] {
  const ng: string[] = [];
  if (!positive(d.robrun?.yaw, d.robrun?.max)) ng.push('sensitivity: ROB RUN の yaw か上限が正の数でない');
  const ids = new Set<string>();
  for (const g of d.games ?? []) {
    if (!g.id || ids.has(g.id)) ng.push(`sensitivity の ${g.name}: id が無いか重複`);
    ids.add(g.id);
    if (!positive(g.yaw)) ng.push(`sensitivity の ${g.name}: yaw が正の数でない`);
    if (!g.sources?.length) ng.push(`sensitivity の ${g.name}: 出典が無い`);
  }
  for (const s of [...(d.robrun?.sources ?? []), ...(d.formula?.sources ?? []), ...(d.games ?? []).flatMap((g) => g.sources ?? [])]) {
    if (!/^https:\/\//.test(s.url) || !s.title) ng.push(`sensitivity: 出典の URL が https でないか題が無い (${s.url})`);
  }
  return ng;
}
