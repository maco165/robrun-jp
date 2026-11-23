#!/usr/bin/env node
// 単体テスト用の偽の claude の CLI。本物の Claude を呼ばずに、FAKE_CLAUDE の型の出力を返す。
//   ok: 決めた形の要約 / refusal: 断られた / badshape: 形の合わない出力 / garbage: JSON でない出力
//   FAKE_CLAUDE_ARGS があれば、受け取った引数をそのファイルに書く
import { writeFileSync } from 'node:fs';
if (process.env.FAKE_CLAUDE_ARGS) writeFileSync(process.env.FAKE_CLAUDE_ARGS, JSON.stringify(process.argv.slice(2)));
const mode = process.env.FAKE_CLAUDE ?? 'ok';
const ok = { headline: '偽の要約', impact: '', points: [{ type: 'buff', target: 'Decoder', text: '偽の要点' }], tags: ['金策'], flags: { wipe: false, server: false, maintenance: false } };
const out = {
  ok: { is_error: false, subtype: 'success', stop_reason: 'end_turn', structured_output: ok },
  refusal: { is_error: false, subtype: 'success', stop_reason: 'refusal', structured_output: null },
  badshape: { is_error: false, subtype: 'success', stop_reason: 'end_turn', structured_output: { headline: '' } },
}[mode];
process.stdout.write(mode === 'garbage' ? 'not json' : JSON.stringify(out));
