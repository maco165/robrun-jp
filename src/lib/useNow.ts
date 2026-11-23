import { useEffect, useState } from 'react';

/** 事前描画と最初の描画では null (時刻を読まない)。画面に出てから 1 秒ごとに進む */
export function useNow(): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}
