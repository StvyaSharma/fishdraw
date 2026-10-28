import { draw_svg, type FishScene } from '../fishdraw.ts';
import { pathData, createPaintPlan, type PaintPlan } from './plan.ts';
import type { ColorSettings } from './settings.ts';
import { bounds } from './anatomy.ts';

export function eyeSvg(plan: PaintPlan): string {
  const eye = plan.scene.anatomy.eye;
  if (!eye.length) return '';
  const b = bounds(eye), x = (b.x + b.right) / 2, y = (b.y + b.bottom) / 2;
  const rx = (b.right - b.x) / 2, ry = (b.bottom - b.y) / 2;
  return `<path d="${pathData(eye)}" fill="${plan.palette.iris}"/><ellipse cx="${x}" cy="${y}" rx="${rx * 0.48}" ry="${ry * 0.48}" fill="${plan.palette.dark}"/><ellipse cx="${x - rx * 0.22}" cy="${y - ry * 0.25}" rx="${rx * 0.13}" ry="${ry * 0.13}" fill="${plan.palette.white}"/>`;
}
export function inkSvg(scene: FishScene, opacity: number): string {
  const svg = draw_svg(scene.polylines);
  return `<g opacity="${opacity}">${svg.slice(svg.indexOf('<path'), -6)}</g>`;
}
export function planSvg(plan: PaintPlan): string {
  const { scene } = plan;
  const definitions = `<filter id="pigment-soften" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="0.65"/></filter><mask id="skin" maskUnits="userSpaceOnUse" x="0" y="0" width="520" height="320"><rect width="520" height="320" fill="white"/><path d="${pathData(scene.anatomy.eye)}" fill="black"/></mask>` +
    plan.regions.map(({ region }, i) => `<clipPath id="region-${i}"><path d="${pathData(region.outline)}" clip-rule="evenodd"/></clipPath>`).join('');
  const paint = plan.regions.map(({ layers }, i) => `<g data-region="${plan.regions[i].region.id}" clip-path="url(#region-${i})" mask="url(#skin)">${layers.map(layer => `<g data-pigment="${layer.id}" fill="${layer.color}"${layer.id === 'base' ? '' : ' filter="url(#pigment-soften)"'}>${layer.bands.map(band => `<path opacity="${band.opacity}" d="${band.path}"/>`).join('')}</g>`).join('')}</g>`).join('');
  const lateral = scene.anatomy.lateralLine.map(line => `<path d="${pathData(line, false)}" fill="none" stroke="${plan.palette.reflective}" stroke-width="1.2" opacity="${plan.settings.lateral}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="320" viewBox="0 0 520 320"><defs>${definitions}</defs><rect width="520" height="320" fill="floralwhite"/><rect x="10" y="10" width="500" height="300" stroke="black" fill="none"/>${paint}${lateral}${eyeSvg(plan)}${inkSvg(scene, plan.settings.ink)}</svg>`;
}
export function draw_colored_svg(scene: FishScene, settings: ColorSettings): string {
  return settings.enabled ? planSvg(createPaintPlan(scene, settings)) : draw_svg(scene.polylines);
}
