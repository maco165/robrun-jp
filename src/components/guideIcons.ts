// 攻略のジャンルごとの線のアイコン (lucide)。入口のカードと、scripts/make-guide-images.tsx のイメージ画像で同じものを使う
import { Banknote, BookOpen, Car, CalendarClock, Crosshair, Crown, Gem, House, Map, RefreshCw, Route, Rss, ShieldCheck, Siren, type LucideIcon } from 'lucide-react';

export const GUIDE_ICONS: Record<string, LucideIcon> = {
  story: BookOpen,
  basics: Route,
  map: Map,
  'wipe-plan': CalendarClock,
  sell: Banknote,
  loot: Gem,
  weapons: Crosshair,
  money: ShieldCheck,
  police: Siren,
  base: House,
  pyramid: Crown,
  vehicle: Car,
  wipe: RefreshCw,
  sources: Rss,
};

export function guideIcon(id: string): LucideIcon {
  return GUIDE_ICONS[id] ?? BookOpen;
}
