import { useEffect, useMemo, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useDialKitController, type DialConfig } from 'dialkit';
import { binomen, parameters_for_seed } from '../../fishdraw.ts';
import { fishInspirations } from '../../presets.ts';
import { FishEditor } from '../editor.tsx';
import { views, type View } from '../view.ts';

/** The specimen lives in the URL, so every fish is a shareable link:
 * `/?seed=Salmo+salar&inspiration=pike&view=engraved`. */
interface SpecimenSearch { seed?: string; inspiration?: string; view?: View }

const DEFAULT_SEED = 'Biggus fishus';

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): SpecimenSearch => ({
    seed: typeof search.seed === 'string' && search.seed.trim() ? search.seed.trim() : undefined,
    // Checked against the catalog in the component, so validation stays free of the engine.
    inspiration: typeof search.inspiration === 'string' ? search.inspiration : undefined,
    view: views.find(v => v === search.view),
  }),
  component: Specimen,
});

function Specimen() {
  const search = Route.useSearch();
  const seed = search.seed ?? DEFAULT_SEED;
  const presetId = fishInspirations.some(p => p.id === search.inspiration) ? search.inspiration! : 'procedural';
  const view = search.view ?? 'watercolour';
  // Draw on the same seed still restarts the editor from that seed's defaults.
  const [revision, setRevision] = useState(0);
  // The Fish panel renders first so it registers first: when a new specimen
  // remounts the editor's panels, they re-register below it and it never moves.
  return <>
    <SpecimenPanel seed={seed} presetId={presetId} view={view} onShow={() => setRevision(r => r + 1)} />
    <FishEditor key={`${seed}\u0000${presetId}\u0000${revision}`} seed={seed} presetId={presetId} view={view} />
  </>;
}

function SpecimenPanel({ seed, presetId, view, onShow }: { seed: string; presetId: string; view: View; onShow: () => void }) {
  const navigate = Route.useNavigate();
  const show = (next: SpecimenSearch) => {
    // Same page, new specimen: keep the panels where they are.
    navigate({ search: prev => ({ ...prev, ...next }), resetScroll: false });
    onShow();
  };
  // Built once: later URL changes reach the panel through setValues below, and
  // DialKit re-registers (and reorders) a panel whose config changes identity.
  const config = useMemo(() => ({
    seed: { type: 'text', default: seed },
    inspiration: { type: 'select', options: fishInspirations.map(p => ({ value: p.id, label: p.label })), default: presetId },
    applyInspiration: { type: 'action' },
    view: { type: 'select', options: [
      { value: 'watercolour', label: 'Watercolour · p5.brush' },
      { value: 'engraved', label: 'Engraved colour · plotter' },
      { value: 'lines', label: 'Line drawing' },
    ], default: view },
    draw: { type: 'action' },
    random: { type: 'action' },
    randomiseTraits: { type: 'action', label: 'Randomise traits' },
  } satisfies DialConfig), []);
  const dial = useDialKitController('Fish', config, {
    onAction(path) {
      if (path === 'draw' || path === 'applyInspiration') {
        const values = dial.getValues();
        const next = values.seed.trim();
        if (next) show({ seed: next, inspiration: values.inspiration });
      }
      if (path === 'random' || path === 'randomiseTraits') {
        parameters_for_seed(crypto.randomUUID());
        const next = binomen();
        const inspiration = path === 'randomiseTraits' ? 'explorer' : dial.getValues().inspiration;
        dial.setValues({ seed: next, inspiration });
        show({ seed: next, inspiration });
      }
    },
  });
  // The view is a URL setting too, replaced rather than pushed.
  const chosen = dial.values.view as View;
  useEffect(() => {
    if (chosen !== view) navigate({ search: prev => ({ ...prev, view: chosen }), replace: true, resetScroll: false });
  }, [chosen, view, navigate]);
  // Back and forward move between specimens; keep the panel in step.
  useEffect(() => {
    const values = dial.getValues();
    if (values.seed !== seed || values.inspiration !== presetId || values.view !== view) dial.setValues({ seed, inspiration: presetId, view });
  }, [seed, presetId, view]);

  return null;
}
