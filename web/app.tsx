import { useDeferredValue, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DialRoot, useDialKitController, type DialConfig } from 'dialkit';
import { binomen, generate_scene, parameters_for_seed } from '../fishdraw.ts';
import { fishInspirations, parameters_for_preset } from '../presets.ts';
import { isOutputFormat, serialize } from '../formats.ts';
import { controlConfig, parameterOverrides } from './controls.ts';
import 'dialkit/styles.css';
import './styles.css';
import { colorConfig, colorSettings } from './color-controls.ts';
import { ColorPreview, paintKey, type PaintedImage } from './color-preview.tsx';
import { draw_colored_svg } from '../color/svg.ts';
import { createPaintPlan } from '../color/plan.ts';

function download(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function FishEditor({ seed, presetId }: { seed: string; presetId: string }) {
  const [painted, setPainted] = useState<PaintedImage | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const baseParams = useMemo(() => parameters_for_preset(seed, presetId), [seed, presetId]);
  const config = useMemo(() => ({
    ...controlConfig(baseParams),
    coloring: colorConfig(),
    reset: { type: 'action' },
    export: {
      _collapsed: true,
      format: { type: 'select', options: ['svg', 'smil', 'json', 'csv', 'ps'], default: 'svg' },
      speed: [1, 0.5, 4, 0.5],
      download: { type: 'action' },
    },
  } satisfies DialConfig), [baseParams]);
  const dial = useDialKitController('Anatomy', config, {
    async onAction(path) {
      if (path === 'reset') dial.resetValues();
      if (path === 'export.download') {
        const values = dial.getValues();
        const format = values.export.format;
        if (!isOutputFormat(format)) return;
        try {
          const settings = colorSettings(values.coloring);
          const fish = generate_scene(seed, { ...baseParams, ...parameterOverrides(values) });
          let content = serialize(fish.polylines, format, values.export.speed);
          if (format === 'svg' && settings.enabled) {
            if (settings.medium === 'watercolor') {
              const key = paintKey(fish, settings);
              try {
                const image = painted?.key === key ? painted.image : await (await import('./watercolor.ts')).paintWatercolor(createPaintPlan(fish, settings), () => false);
                content = `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="320"><image width="520" height="320" href="${image}"/></svg>`;
              } catch {
                // Match the preview's explicit vector fallback on non-WebGL2 devices.
                content = draw_colored_svg(fish, settings);
              }
            } else content = draw_colored_svg(fish, settings);
          }
          const extension = format === 'smil' ? 'svg' : format;
          const type = format === 'svg' || format === 'smil' ? 'image/svg+xml' : format === 'json' ? 'application/json' : 'text/plain';
          const filename = seed.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '') || 'fish';
          download(content, `${filename}.${extension}`, type);
          setExportError(null);
        } catch (error) {
          setExportError(error instanceof Error ? error.message : 'Unable to export this fish.');
        }
      }
    },
  });
  const values = useDeferredValue(dial.values);
  // Color-only changes must not rerun the seeded anatomy generator.
  const geometryKey = JSON.stringify(parameterOverrides(values));
  const result = useMemo(() => {
    try {
      return { scene: generate_scene(seed, { ...baseParams, ...parameterOverrides(values) }), error: null };
    } catch {
      return { scene: null, error: 'Unable to draw this combination. Reset the parameters or try another seed.' };
    }
  }, [seed, baseParams, geometryKey]);
  if (!result.scene) return <p role="alert">{result.error}</p>;
  return <>
    <ColorPreview scene={result.scene} settings={colorSettings(values.coloring)} pending={values !== dial.values} onPaint={setPainted} />
    {exportError ? <p role="alert">{exportError}</p> : null}
  </>;
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
