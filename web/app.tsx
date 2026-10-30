import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DialRoot, useDialKitController } from 'dialkit';
import { binomen, generate, parameters_for_seed } from '../fishdraw.ts';
import { fishInspirations, parameters_for_preset } from '../presets.ts';
import { isOutputFormat, serialize } from '../formats.ts';
import { anatomyConfig, outputConfig, parameterOverrides, surfaceConfig } from './controls.ts';
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

type Editor = { seed: string; reset(): void; render(watercolour: boolean): ReturnType<typeof generate> };

function FishEditor({ seed, presetId, watercolour, editor }: {
  seed: string; presetId: string; watercolour: boolean; editor: React.RefObject<Editor | null>;
}) {
  const baseParams = useMemo(() => parameters_for_preset(seed, presetId), [seed, presetId]);
  const anatomy = useDialKitController('Anatomy', useMemo(() => anatomyConfig(baseParams), [baseParams]));
  const surface = useDialKitController('Surface', useMemo(() => surfaceConfig(baseParams), [baseParams]));
  // The Output panel lives in App so the renderer choice survives new seeds.
  editor.current = {
    seed,
    reset() { anatomy.resetValues(); surface.resetValues(); },
    render: paint => generate(seed, { ...baseParams, ...parameterOverrides(anatomy.getValues(), surface.getValues()) }, {}, { paint }),
  };
  const anatomyValues = useDeferredValue(anatomy.values);
  const surfaceValues = useDeferredValue(surface.values);
  const result = useMemo(() => {
    try {
      const fish = generate(seed, { ...baseParams, ...parameterOverrides(anatomyValues, surfaceValues) }, {}, { paint: watercolour });
      const svg = serialize(fish.polylines, 'svg', 1, fish.colors);
      return { fish, image: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, error: null };
    } catch {
      return { fish: null, image: '', error: 'Unable to draw this combination. Reset the parameters or try another seed.' };
    }
  }, [seed, baseParams, anatomyValues, surfaceValues, watercolour]);

  if (result.error) return <p role="alert">{result.error}</p>;
  if (watercolour && result.fish) return <Painting fish={result.fish} seed={seed} />;
  return <img
    src={result.image}
    alt={`Procedural fish drawing named ${seed}`}
    width="520"
    height="320"
    aria-busy={anatomyValues !== anatomy.values || surfaceValues !== surface.values}
  />;
}

/** p5.brush paints into one WebGL2 canvas; it is reparented here and repainted per change. */
function Painting({ fish, seed }: { fish: ReturnType<typeof generate>; seed: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!host.current) return;
    try {
      const canvas = paintCanvas(host.current);
      canvas.setAttribute('aria-label', `Watercolour fish painting named ${seed}`);
      paint(fish, seed);
      setError(null);
    } catch {
      setError('Watercolour needs WebGL2. Switch the renderer back to Engraved.');
    }
  }, [fish, seed]);
  return error ? <p role="alert">{error}</p> : <div ref={host} className="painting" />;
}

/** PNG from the painting canvas, or from the engraved SVG rasterised at 2×. */
async function toPng(svg: string | null): Promise<Blob> {
  let source: CanvasImageSource = document.getElementById('fish-painting') as HTMLCanvasElement;
  if (svg) {
    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    await img.decode();
    source = img;
  }
  const out = document.createElement('canvas');
  out.width = 1040; out.height = 640;
  out.getContext('2d')!.drawImage(source, 0, 0, out.width, out.height);
  return new Promise((resolve, reject) => out.toBlob(b => b ? resolve(b) : reject(new Error('PNG export failed.')), 'image/png'));
}

function App() {
  const [specimen, setSpecimen] = useState({ seed: 'Biggus fishus', presetId: 'procedural', revision: 0 });
  const editor = useRef<Editor | null>(null);
  const dial = useDialKitController('Specimen', {
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
  const output = useDialKitController('Output', useMemo(() => outputConfig(), []), {
    onAction(path) {
      const current = editor.current;
      if (!current) return;
      if (path === 'reset') current.reset();
      if (path === 'export.download') {
        const values = output.getValues();
        const format = values.export.format;
        const filename = current.seed.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '') || 'fish';
        const watercolour = values.renderer === 'watercolour';
        if (format === 'png') {
          const engraved = watercolour ? null : current.render(false);
          void toPng(engraved && serialize(engraved.polylines, 'svg', 1, engraved.colors))
            .then(blob => download(blob, `${filename}.png`, 'image/png'));
          return;
        }
        if (!isOutputFormat(format)) return;
        const fish = current.render(watercolour);
        const extension = format === 'smil' ? 'svg' : format;
        const type = format === 'svg' || format === 'smil' ? 'image/svg+xml' : format === 'json' ? 'application/json' : 'text/plain';
        download(serialize(fish.polylines, format, values.export.speed, fish.colors), `${filename}.${extension}`, type);
      }
    },
  });
  return <>
    <FishEditor key={specimen.revision} seed={specimen.seed} presetId={specimen.presetId}
      watercolour={output.values.renderer === 'watercolour'} editor={editor} />
    <DialRoot productionEnabled versions="menu" />
  </>;
}

const root = document.getElementById('root');
if (!root) throw new Error('Missing application root.');
createRoot(root).render(<App />);
