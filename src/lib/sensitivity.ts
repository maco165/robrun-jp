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
