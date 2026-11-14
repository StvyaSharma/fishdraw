import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useDialKitController, type DialConfig } from 'dialkit';
import { colour_for_preset, parameters_for_preset } from '../presets.ts';
import { isOutputFormat, serialize } from '../formats.ts';
import { controlConfig, parameterOverrides } from './controls.ts';
import { colourControlConfig, colourOverrides } from './colourControls.ts';
import type { PaintPlan } from '../colour/index.ts';
import { artwork, type Artwork, type ArtworkRequest } from './artwork.ts';

import type { View } from './view.ts';

function download(content: string | Blob, filename: string, type: string) {
  const url = URL.createObjectURL(content instanceof Blob ? content : new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Hosts the shared p5.brush canvas and repaints when the plan changes. */
function Painting({ plan, seed }: { plan: PaintPlan; seed: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    if (!host.current) return;
    const element = host.current;
    setBusy(true);
    const controller = new AbortController();
    // p5.brush loads only when a painting is first shown.
    import('./paint.ts').then(async ({ paint, paintCanvas }) => {
      if (controller.signal.aborted) return;
      const canvas = paintCanvas(element);
      canvas.setAttribute('aria-label', `Watercolour painting of a procedural fish named ${seed}`);
      if (await paint(plan, seed, controller.signal)) setBusy(false);
    });
    return () => controller.abort();
  }, [plan, seed]);
  return <div ref={host} className="painting" aria-busy={busy} />;
}


type Outcome = Artwork | { error: string };

/** One worker for the page; only the newest request's answer is shown. */
let worker: Worker | null = null;
let nextId = 0;
function useArtwork(request: ArtworkRequest) {
  const [state, setState] = useState<{ result: Outcome | null; pending: boolean }>({ result: null, pending: true });
  useEffect(() => {
    worker ??= new Worker(new URL('./artwork.worker.ts', import.meta.url), { type: 'module' });
    const id = ++nextId;
    setState(s => ({ ...s, pending: true }));
    const listen = (event: MessageEvent<{ id: number; result?: Artwork; error?: string }>) => {
      if (event.data.id !== id) return;
      if (event.data.error) console.error(event.data.error);
      setState({ result: event.data.result ?? { error: 'Unable to draw this combination. Reset the parameters or try another seed.' }, pending: false });
    };
    worker.addEventListener('message', listen);
    worker.postMessage({ id, request });
    return () => worker?.removeEventListener('message', listen);
  }, [request]);
  return state;
}

export function FishEditor({ seed, presetId, view }: { seed: string; presetId: string; view: View }) {
  const painted = view === 'watercolour';
  const baseParams = useMemo(() => parameters_for_preset(seed, presetId), [seed, presetId]);
  const config = useMemo(() => ({
    ...controlConfig(baseParams),
    reset: { type: 'action' },
    export: {
      _collapsed: true,
      format: { type: 'select', options: ['png', 'svg', 'smil', 'json', 'csv', 'ps'], default: 'png' },
      speed: [1, 0.5, 4, 0.5],
      download: { type: 'action' },
    },
  } satisfies DialConfig), [baseParams]);
  const dial = useDialKitController('Anatomy', config, {
    onAction(path) {
      if (path === 'reset') dial.resetValues();
      if (path === 'export.download') {
        const values = dial.getValues();
        const format = values.export.format;
        const filename = seed.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '') || 'fish';
        if (format === 'png') {
          const save = (canvas: HTMLCanvasElement) => canvas.toBlob(blob => blob && download(blob, `${filename}.png`, 'image/png'), 'image/png');
          if (painted) { const canvas = document.querySelector<HTMLCanvasElement>('#fish-painting'); if (canvas) save(canvas); return; }
          // The line drawing rasterises at twice its size.
          const img = document.querySelector<HTMLImageElement>('#root > img');
          if (!img) return;
          const canvas = Object.assign(document.createElement('canvas'), { width: 1040, height: 640 });
          canvas.getContext('2d')!.drawImage(img, 0, 0, 1040, 640);
          save(canvas);
          return;
        }
        if (!isOutputFormat(format)) return;
        const art = artwork({
          seed, view: view === 'lines' ? 'lines' : 'engraved',
          params: { ...baseParams, ...parameterOverrides(values) },
          genes: { ...baseGenes, ...colourOverrides(colour.getValues() as Record<string, unknown>) },
        });
        if (art.kind !== 'svg') return;
        const extension = format === 'smil' ? 'svg' : format;
        const type = format === 'svg' || format === 'smil' ? 'image/svg+xml' : format === 'json' ? 'application/json' : 'text/plain';
        // Coloured views export the engraved colour: one pen per pigment.
        download(serialize(art.drawing, format, values.export.speed, art.colors), `${filename}.${extension}`, type);
      }
    },
  });
  // After Anatomy, so the Colour panel sits below it.
  const baseGenes = useMemo(() => colour_for_preset(seed, presetId), [seed, presetId]);
  // A stable config: DialKit re-registers (and reorders) a panel whose config changes identity.
  const colourConfig = useMemo(() => ({
    ...colourControlConfig(baseGenes),
    resetColour: { type: 'action', label: 'Reset colour' },
  } as DialConfig), [baseGenes]);
  const colour = useDialKitController('Colour', colourConfig, {
    onAction(path) { if (path === 'resetColour') colour.resetValues(); },
  });
  const values = useDeferredValue(dial.values);
  const colourValues = useDeferredValue(colour.values) as Record<string, unknown>;
  const request = useMemo<ArtworkRequest>(() => ({
    seed, view,
    params: { ...baseParams, ...parameterOverrides(values) },
    genes: { ...baseGenes, ...colourOverrides(colourValues) },
  }), [seed, view, baseParams, values, baseGenes, colourValues]);
  const { result, pending } = useArtwork(request);

  if (!result) return <div className="placeholder" aria-busy="true" />;
  if ('error' in result) return <p role="alert">{result.error}</p>;
  if (result.kind === 'painting') return <Painting plan={result.plan} seed={seed} />;
  return <img
    src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(result.svg)}`}
    alt={`Procedural fish drawing named ${seed}${view === 'engraved' ? ', engraved in colour' : ''}`}
    width="520"
    height="320"
    aria-busy={pending || values !== dial.values}
  />;
}

