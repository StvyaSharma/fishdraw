import { useEffect, useMemo, useState } from 'react';
import { draw_svg, type FishScene } from '../fishdraw.ts';
import { createPaintPlan } from '../color/plan.ts';
import { planSvg } from '../color/svg.ts';
import type { ColorSettings } from '../color/settings.ts';

export interface PaintedImage { key: string; image: string }
export const paintKey = (scene: FishScene, settings: ColorSettings) => JSON.stringify([scene.seed, scene.params, settings]);
export function ColorPreview({ scene, settings, pending, onPaint }: {
  scene: FishScene; settings: ColorSettings; pending: boolean; onPaint: (painted: PaintedImage) => void;
}) {
  const key = paintKey(scene, settings);
  const plan = useMemo(() => settings.enabled ? createPaintPlan(scene, settings) : null, [scene, key]);
  const vector = useMemo(() => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(plan ? planSvg(plan) : draw_svg(scene.polylines))}`, [scene, plan]);
  const [painted, setPainted] = useState<PaintedImage | null>(null);
  const [error, setError] = useState<{ key: string; text: string } | null>(null);
  useEffect(() => {
    if (!plan || settings.medium !== 'watercolor') return;
    let cancelled = false;
    // Coalesce slider changes before entering the stateful paint runtime.
    const timer = setTimeout(() => {
      void import('./watercolor.ts').then(({ paintWatercolor }) => paintWatercolor(plan, () => cancelled)).then(image => {
        if (cancelled) return;
        const result = { key, image }; setPainted(result); setError(null); onPaint(result);
      }).catch(reason => {
        if (!cancelled) setError({ key, text: `${reason instanceof Error ? reason.message : 'Watercolor is unavailable.'} Showing vector color.` });
      });
    }, 120);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [plan, key, onPaint]);
  const watercolor = settings.enabled && settings.medium === 'watercolor';
  const ready = painted?.key === key;
  const failed = error?.key === key;
  return <>
    <img src={watercolor && ready ? painted.image : vector}
      alt={`Procedural fish drawing named ${scene.seed}`} width="520" height="320"
      aria-busy={pending || (watercolor && !ready && !failed)}
      data-medium={!settings.enabled ? 'ink' : watercolor && ready ? 'watercolor' : 'vector'} />
    {failed ? <p role="status">{error.text}</p> : null}
  </>;
}
