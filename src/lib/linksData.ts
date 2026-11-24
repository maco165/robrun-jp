// リンク集 (正本は data/links.json)。読むページだけに入るよう data.ts と分ける
import json from '../../data/links.json';
import type { Links } from './links';

export const LINKS = json as Links;
