import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DialRoot, useDialKitController, type DialConfig } from 'dialkit';
import { binomen, generate, parameters_for_seed } from '../fishdraw.ts';
import { colour_for_preset, fishInspirations, parameters_for_preset } from '../presets.ts';
import { isOutputFormat, serialize } from '../formats.ts';
import { controlConfig, parameterOverrides } from './controls.ts';
import { colourControlConfig, colourOverrides } from './colourControls.ts';
import { colourPlan, type PaintPlan } from '../colour/index.ts';
import { paint, paintCanvas } from './paint.ts';
import 'dialkit/styles.css';
import './styles.css';

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
    const canvas = paintCanvas(host.current);
    canvas.setAttribute('aria-label', `Watercolour painting of a procedural fish named ${seed}`);
    setBusy(true);
    // Let the busy state render before the (synchronous) painting blocks.
    const frame = requestAnimationFrame(() => { paint(plan, seed); setBusy(false); });
    return () => cancelAnimationFrame(frame);
  }, [plan, seed]);
  return <div ref={host} className="painting" aria-busy={busy} />;
}

function FishEditor({ seed, presetId }: { seed: string; presetId: string }) {
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
  const baseGenes = useMemo(() => colour_for_preset(seed, presetId), [seed, presetId]);
  const colour = useDialKitController('Colour', {
    painted: true,
    ...colourControlConfig(baseGenes),
    resetColour: { type: 'action', label: 'Reset colour' },
  } as DialConfig, {
    onAction(path) { if (path === 'resetColour') colour.resetValues(); },
  });
  const dial = useDialKitController('Anatomy', config, {
    onAction(path) {
      if (path === 'reset') dial.resetValues();
      if (path === 'export.download') {
        const values = dial.getValues();
        const format = values.export.format;
        const filename = seed.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '') || 'fish';
        if (format === 'png') {
          document.querySelector<HTMLCanvasElement>('#fish-painting')?.toBlob(blob => blob && download(blob, `${filename}.png`, 'image/png'), 'image/png');
          return;
        }
        if (!isOutputFormat(format)) return;
        const fish = generate(seed, { ...baseParams, ...parameterOverrides(values) });
        const extension = format === 'smil' ? 'svg' : format;
        const type = format === 'svg' || format === 'smil' ? 'image/svg+xml' : format === 'json' ? 'application/json' : 'text/plain';
        download(serialize(fish.polylines, format, values.export.speed), `${filename}.${extension}`, type);
      }
    },
  });
  const values = useDeferredValue(dial.values);
  const colourValues = useDeferredValue(colour.values) as Record<string, unknown>;
  const painted = Boolean(colourValues.painted);
  const result = useMemo(() => {
    try {
      const fish = generate(seed, { ...baseParams, ...parameterOverrides(values) });
      if (painted) {
        const plan = colourPlan(fish, { ...baseGenes, ...colourOverrides(colourValues) }, seed);
        return { plan, image: '', error: null };
      }
      const svg = serialize(fish.polylines, 'svg');
      return { plan: null, image: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, error: null };
    } catch {
      return { plan: null, image: '', error: 'Unable to draw this combination. Reset the parameters or try another seed.' };
    }
  }, [seed, baseParams, values, painted, baseGenes, colourValues]);

  if (result.error) return <p role="alert">{result.error}</p>;
  if (result.plan) return <Painting plan={result.plan} seed={seed} />;
  return <img
    src={result.image}
    alt={`Procedural fish drawing named ${seed}`}
    width="520"
    height="320"
    aria-busy={values !== dial.values}
  />;
}

function App() {
  const [specimen, setSpecimen] = useState({ seed: 'Biggus fishus', presetId: 'procedural', revision: 0 });
  const dial = useDialKitController('Fish', {
    seed: { type: 'text', default: 'Biggus fishus' },
    inspiration: { type: 'select', options: fishInspirations.map(p => ({ value: p.id, label: p.label })), default: 'procedural' },
    applyInspiration: { type: 'action' },
    draw: { type: 'action' },
    random: { type: 'action' },
    randomiseTraits: { type: 'action', label: 'Randomise traits' },
  }, {
    onAction(path) {
      if (path === 'draw' || path === 'applyInspiration') {
        const values = dial.getValues();
        const next = values.seed.trim();
        if (next) setSpecimen(s => ({ seed: next, presetId: values.inspiration, revision: s.revision + 1 }));
      }
      if (path === 'random' || path === 'randomiseTraits') {
        parameters_for_seed(crypto.randomUUID());
        const next = binomen();
        const presetId = path === 'randomiseTraits' ? 'explorer' : dial.getValues().inspiration;
        dial.setValues({ seed: next, inspiration: presetId });
        setSpecimen(s => ({ seed: next, presetId, revision: s.revision + 1 }));
      }
    },
  });
  return <>
    <FishEditor key={specimen.revision} seed={specimen.seed} presetId={specimen.presetId} />
    <DialRoot productionEnabled versions="menu" />
  </>;
}

const root = document.getElementById('root');
if (!root) throw new Error('Missing application root.');
createRoot(root).render(<App />);
