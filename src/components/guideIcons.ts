// 攻略のジャンルごとの線のアイコン (lucide)。入口のカードと、scripts/make-guide-images.tsx のイメージ画像で同じものを使う
import { Banknote, BookOpen, CalendarClock, Crosshair, Map, Route, type LucideIcon } from 'lucide-react';

export const GUIDE_ICONS: Record<string, LucideIcon> = {
  start: Route,
  wipe: CalendarClock,
  money: Banknote,
  gear: Crosshair,
  world: Map,
};

export function guideIcon(id: string): LucideIcon {
  return GUIDE_ICONS[id] ?? BookOpen;
}
