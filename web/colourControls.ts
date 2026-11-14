import type { DialConfig } from 'dialkit';
import { geneGroups, type Genes, type GeneGroup } from '../colour/index.ts';

/** The Colour panel is generated from the gene specs: one folder per gene
 * group, one control per gene. A new effect's genes appear here on their own. */
export function colourControlConfig(genes: Genes, groups: GeneGroup[] = geneGroups()) {
  const config: Record<string, unknown> = {};
  for (const group of groups) {
    const folder: Record<string, unknown> = { _collapsed: !['palette', 'style'].includes(group.key) };
    for (const gene of group.genes) {
      const value = genes[`${group.key}.${gene.key}`];
      if (gene.kind === 'range') folder[gene.key] = [value, gene.min, gene.max, gene.step];
      else if (gene.kind === 'toggle') folder[gene.key] = Boolean(value);
      else folder[gene.key] = { type: 'select', options: gene.options.map(o => ({ value: String(o.id), label: o.label })), default: String(value) };
    }
    config[group.key] = folder;
  }
  return config as DialConfig;
}

/** Turn panel values back into flat genes. */
export function colourOverrides(values: Record<string, unknown>, groups: GeneGroup[] = geneGroups()): Genes {
  const genes: Genes = {};
  for (const group of groups) {
    const folder = values[group.key] as Record<string, unknown> | undefined;
    if (!folder) continue;
    for (const gene of group.genes) {
      const v = folder[gene.key];
      if (v !== undefined) genes[`${group.key}.${gene.key}`] = Number(v);
    }
  }
  return genes;
}
