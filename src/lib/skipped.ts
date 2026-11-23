// 要約できなかった記事の記録 (data/skipped.json)。本文は入れず、gid・状態・回数・最後の理由だけ。
// 断られた記事 (refused) と、MAX_ATTEMPTS 回失敗した記事は、取得の段で取らない (毎時、同じ記事に料金をかけ続けない)。
import { MAX_ATTEMPTS } from './tags.ts';

export type Skipped = { gid: string; status: 'refused' | 'failing'; attempts: number; lastError: string; at: string };

/** もう取らない記事か */
export function isGivenUp(s: Pick<Skipped, 'status' | 'attempts'>): boolean {
  return s.status === 'refused' || s.attempts >= MAX_ATTEMPTS;
}

/** 失敗を 1 回足す (断られたら refused にする) */
export function recordFailure(list: Skipped[], gid: string, error: string, refused: boolean, at: string): Skipped[] {
  const prev = list.find((s) => s.gid === gid);
  const next: Skipped = { gid, status: refused ? 'refused' : 'failing', attempts: (prev?.attempts ?? 0) + 1, lastError: error.slice(0, 200), at };
  return [...list.filter((s) => s.gid !== gid), next];
}

/** 要約できたら、その記事の失敗の記録を消す */
export function clearFailure(list: Skipped[], gid: string): Skipped[] {
  return list.filter((s) => s.gid !== gid);
}
