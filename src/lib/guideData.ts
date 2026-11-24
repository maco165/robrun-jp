// 攻略ページの中身 (正本は data/guide.json)。読むページだけに入るよう data.ts と分ける
import json from '../../data/guide.json';
import type { Guide } from './guide';

export const GUIDE = json as Guide;
