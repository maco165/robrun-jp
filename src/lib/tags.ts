// タグと変更の種類の決めたリスト (PJ-030 の計画書 7 章)。要約はこの中からしか選ばない。
// 画面 (記事一覧の絞り込み) と要約 (scripts/summarize.ts) と検査 (scripts/check-news.ts) が読む。他のファイルを読まない。
export const TAGS = ['金策', '強盗', '武器', '車両', '拠点', '警察', '刑務所', 'サーバー', 'ワイプ', 'UI', 'バグ修正', 'イベント', 'バトルパス', 'その他'] as const;
export const CHANGE_TYPES = ['buff', 'nerf', 'new', 'fix', 'change'] as const;

/** 要約の上限 (全文の訳にならないように。要約の形 src/lib/summary.ts と検査 scripts/check-news.ts が同じ値を使う) */
export const LIMITS = { headline: 80, impact: 200, target: 60, text: 120, points: 12 } as const;
/** 同じ記事の要約に失敗してよい回数。これを超えたら取らない (毎時、同じ記事に料金をかけ続けない) */
export const MAX_ATTEMPTS = 3;
/** 1 回の要約の件数の上限。溜まった記事は次の回に回す (1 回が時間切れにならないように) */
export const MAX_PER_RUN = 5;
