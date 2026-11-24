// 武器と防具の比較 (正本は data/gear.json)。読むページだけに入るよう data.ts と分ける
import json from '../../data/gear.json';
import type { Gear } from './gear';

export const GEAR = json as Gear;
