import { useDeferredValue, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DialRoot, useDialKitController, type DialConfig } from 'dialkit';
import { binomen, generate, parameters_for_seed } from '../fishdraw.ts';
import { isOutputFormat, serialize } from '../formats.ts';
import { controlConfig, parameterOverrides } from './controls.ts';
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

function FishEditor({ seed }: { seed: string }) {
  const config = useMemo(() => ({
    ...controlConfig(parameters_for_seed(seed)),
    reset: { type: 'action' },
    export: {
      _collapsed: true,
      format: { type: 'select', options: ['svg', 'smil', 'json', 'csv', 'ps'], default: 'svg' },
      speed: [1, 0.5, 4, 0.5],
      download: { type: 'action' },
    },
  } satisfies DialConfig), [seed]);
  const dial = useDialKitController('Anatomy', config, {
    onAction(path) {
      if (path === 'reset') dial.resetValues();
      if (path === 'export.download') {
        const values = dial.getValues();
        const format = values.export.format;
        if (!isOutputFormat(format)) return;
        const fish = generate(seed, parameterOverrides(values));
        const extension = format === 'smil' ? 'svg' : format;
        const type = format === 'svg' || format === 'smil' ? 'image/svg+xml' : format === 'json' ? 'application/json' : 'text/plain';
        const filename = seed.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '') || 'fish';
        download(serialize(fish.polylines, format, values.export.speed), `${filename}.${extension}`, type);
      }
    },
  });
  const values = useDeferredValue(dial.values);
  const result = useMemo(() => {
    try {
      const fish = generate(seed, parameterOverrides(values));
      const svg = serialize(fish.polylines, 'svg');
      return { image: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, error: null };
    } catch {
      return { image: '', error: 'Unable to draw this combination. Reset the parameters or try another seed.' };
    }
  }, [seed, values]);

  return result.error ? <p role="alert">{result.error}</p> : <img
    src={result.image}
    alt={`Procedural fish drawing named ${seed}`}
    width="520"
    height="320"
    aria-busy={values !== dial.values}
  />;
}

function App() {
  const [seed, setSeed] = useState('Biggus fishus');
  const dial = useDialKitController('Fish', {
    seed: { type: 'text', default: 'Biggus fishus' },
    draw: { type: 'action' },
    random: { type: 'action' },
  }, {
    onAction(path) {
      if (path === 'draw') {
        const next = dial.getValues().seed.trim();
        if (next) setSeed(next);
      }
      if (path === 'random') {
        parameters_for_seed(crypto.randomUUID());
        const next = binomen();
        dial.setValue('seed', next);
        setSeed(next);
      }
    },
  });
  return <>
    <FishEditor key={seed} seed={seed} />
    <DialRoot productionEnabled versions="menu" />
  </>;
}

const root = document.getElementById('root');
if (!root) throw new Error('Missing application root.');
createRoot(root).render(<App />);
