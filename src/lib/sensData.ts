// 感度変換の係数 (正本は data/sensitivity.json)。読むページだけに入るよう data.ts と分ける
import json from '../../data/sensitivity.json';
import type { SensData } from './sensitivity';

export const SENS = json as SensData;
