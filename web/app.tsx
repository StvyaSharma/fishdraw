import { useDeferredValue, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DialRoot, useDialKitController } from 'dialkit';
import { binomen, generate, parameters_for_seed } from '../fishdraw.ts';
import { fishInspirations, parameters_for_preset } from '../presets.ts';
import { isOutputFormat, serialize } from '../formats.ts';
import { anatomyConfig, outputConfig, parameterOverrides, surfaceConfig } from './controls.ts';
import 'dialkit/styles.css';
import './styles.css';

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
  const baseParams = useMemo(() => parameters_for_preset(seed, presetId), [seed, presetId]);
  const anatomy = useDialKitController('Anatomy', useMemo(() => anatomyConfig(baseParams), [baseParams]));
  const surface = useDialKitController('Surface', useMemo(() => surfaceConfig(baseParams), [baseParams]));
  const render = () => generate(seed, { ...baseParams, ...parameterOverrides(anatomy.getValues(), surface.getValues()) });
  const output = useDialKitController('Output', useMemo(() => outputConfig(), []), {
    onAction(path) {
      if (path === 'reset') { anatomy.resetValues(); surface.resetValues(); }
      if (path === 'export.download') {
        const values = output.getValues();
        const format = values.export.format;
        if (!isOutputFormat(format)) return;
        const fish = render();
        const extension = format === 'smil' ? 'svg' : format;
        const type = format === 'svg' || format === 'smil' ? 'image/svg+xml' : format === 'json' ? 'application/json' : 'text/plain';
        const filename = seed.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '') || 'fish';
        download(serialize(fish.polylines, format, values.export.speed, fish.colors), `${filename}.${extension}`, type);
      }
    },
  });
  const anatomyValues = useDeferredValue(anatomy.values);
  const surfaceValues = useDeferredValue(surface.values);
  const result = useMemo(() => {
    try {
      const fish = generate(seed, { ...baseParams, ...parameterOverrides(anatomyValues, surfaceValues) });
      const svg = serialize(fish.polylines, 'svg', 1, fish.colors);
      return { image: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, error: null };
    } catch {
      return { image: '', error: 'Unable to draw this combination. Reset the parameters or try another seed.' };
    }
  }, [seed, baseParams, anatomyValues, surfaceValues]);

  return result.error ? <p role="alert">{result.error}</p> : <img
    src={result.image}
    alt={`Procedural fish drawing named ${seed}`}
    width="520"
    height="320"
    aria-busy={anatomyValues !== anatomy.values || surfaceValues !== surface.values}
  />;
}

function App() {
  const [specimen, setSpecimen] = useState({ seed: 'Biggus fishus', presetId: 'procedural', revision: 0 });
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
  return <>
    <FishEditor key={specimen.revision} seed={specimen.seed} presetId={specimen.presetId} />
    <DialRoot productionEnabled versions="menu" />
  </>;
}

const root = document.getElementById('root');
if (!root) throw new Error('Missing application root.');
createRoot(root).render(<App />);
