/**
 * Imagen AI Initial-Seed Placeholder Avatar Generator
 * Generates unique, high-fidelity 3D-styled monogram SVG data URLs based on user initials
 * and deterministic seeds for profiles that lack a custom image.
 */

export type ImagenAvatarStyle =
  | '3d_crest'
  | 'metallic_monogram'
  | 'geometric_prism'
  | 'luxury_seal'
  | 'emerald_tech'
  | 'crimson_vanguard'
  | 'obsidian_cyber'
  | 'royal_indigo';

export interface ImagenStylePreset {
  id: ImagenAvatarStyle;
  label: string;
  bgGradStart: string;
  bgGradEnd: string;
  ringColor: string;
  textColor: string;
  glowColor: string;
  accentMesh: string;
  fontFamily: string;
  emblemShape: 'circle' | 'shield' | 'octagon' | 'crest';
}

export const IMAGEN_STYLE_PRESETS: ImagenStylePreset[] = [
  {
    id: '3d_crest',
    label: '3D Gold & Navy Crest',
    bgGradStart: '#0F172A',
    bgGradEnd: '#1E293B',
    ringColor: '#F59E0B',
    textColor: '#FDE68A',
    glowColor: 'rgba(245, 158, 11, 0.35)',
    accentMesh: '#3B82F6',
    fontFamily: 'serif',
    emblemShape: 'crest',
  },
  {
    id: 'royal_indigo',
    label: 'Royal Indigo Monogram',
    bgGradStart: '#1E1B4B',
    bgGradEnd: '#312E81',
    ringColor: '#818CF8',
    textColor: '#EEF2FF',
    glowColor: 'rgba(99, 102, 241, 0.4)',
    accentMesh: '#C7D2FE',
    fontFamily: 'sans-serif',
    emblemShape: 'circle',
  },
  {
    id: 'emerald_tech',
    label: 'Emerald Tech Prism',
    bgGradStart: '#064E3B',
    bgGradEnd: '#022C22',
    ringColor: '#10B981',
    textColor: '#A7F3D0',
    glowColor: 'rgba(16, 185, 129, 0.35)',
    accentMesh: '#34D399',
    fontFamily: 'sans-serif',
    emblemShape: 'octagon',
  },
  {
    id: 'luxury_seal',
    label: 'Bronze Luxury Seal',
    bgGradStart: '#271B12',
    bgGradEnd: '#451A03',
    ringColor: '#D97706',
    textColor: '#FDE68A',
    glowColor: 'rgba(217, 119, 6, 0.4)',
    accentMesh: '#F59E0B',
    fontFamily: 'serif',
    emblemShape: 'circle',
  },
  {
    id: 'crimson_vanguard',
    label: 'Crimson Vanguard Shield',
    bgGradStart: '#4C0519',
    bgGradEnd: '#881337',
    ringColor: '#FB7185',
    textColor: '#FFE4E6',
    glowColor: 'rgba(244, 63, 94, 0.4)',
    accentMesh: '#E11D48',
    fontFamily: 'sans-serif',
    emblemShape: 'shield',
  },
  {
    id: 'obsidian_cyber',
    label: 'Obsidian Cyber Ring',
    bgGradStart: '#090D16',
    bgGradEnd: '#111827',
    ringColor: '#38BDF8',
    textColor: '#E0F2FE',
    glowColor: 'rgba(56, 189, 248, 0.35)',
    accentMesh: '#0EA5E9',
    fontFamily: 'sans-serif',
    emblemShape: 'octagon',
  },
];

/**
 * Extracts 1-2 clean uppercase initials from full name or identifier
 */
export function getInitialsFromName(name: string): string {
  if (!name || !name.trim()) return 'CP';
  const clean = name
    .trim()
    .replace(/[()[\]{}]/g, '')
    .replace(/\s+/g, ' ');
  const parts = clean.split(' ').filter((p) => p && !p.startsWith('@'));
  if (parts.length === 0) return 'CP';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Deterministic hash algorithm to consistently pick a style preset for a given string seed
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Selects a style preset deterministically based on name / seed
 */
export function getStylePresetForSeed(seed: string, styleId?: ImagenAvatarStyle): ImagenStylePreset {
  if (styleId) {
    const found = IMAGEN_STYLE_PRESETS.find((s) => s.id === styleId);
    if (found) return found;
  }
  const index = hashString(seed || 'CP') % IMAGEN_STYLE_PRESETS.length;
  return IMAGEN_STYLE_PRESETS[index];
}

/**
 * Generates an SVG string or SVG Data URL for an Imagen initial-seed avatar badge
 */
export function generateImagenAvatarSvgDataUrl(
  name: string,
  options?: {
    customInitials?: string;
    styleId?: ImagenAvatarStyle;
    size?: number;
  }
): string {
  const initials = (options?.customInitials || getInitialsFromName(name)).slice(0, 3);
  const preset = getStylePresetForSeed(name + (options?.customInitials || ''), options?.styleId);
  const size = options?.size || 256;
  const center = size / 2;
  const radius = center - 8;

  // Render 3D-styled SVG graphic
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${preset.bgGradStart}" />
      <stop offset="100%" stop-color="${preset.bgGradEnd}" />
    </linearGradient>
    <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${preset.ringColor}" />
      <stop offset="100%" stop-color="${preset.accentMesh}" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
    <filter id="dropShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.5" />
    </filter>
  </defs>

  <!-- Background Base -->
  <rect width="${size}" height="${size}" rx="${size / 2}" fill="url(#bgGrad)" />

  <!-- Outer Ring Accent -->
  <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="url(#ringGrad)" stroke-width="3" opacity="0.85" />
  <circle cx="${center}" cy="${center}" r="${radius - 6}" fill="none" stroke="${preset.ringColor}" stroke-width="1" stroke-dasharray="4 6" opacity="0.5" />

  <!-- Geometric Inner Mesh Highlight -->
  <circle cx="${center - 30}" cy="${center - 40}" r="60" fill="${preset.glowColor}" filter="url(#glow)" />
  <circle cx="${center + 35}" cy="${center + 45}" r="50" fill="${preset.accentMesh}" opacity="0.15" />

  <!-- Center Emblem Shape -->
  <g filter="url(#dropShadow)">
    ${
      preset.emblemShape === 'shield'
        ? `<path d="M ${center} ${center - 55} L ${center + 50} ${center - 35} L ${center + 45} ${center + 20} C ${center + 35} ${center + 60}, ${center} ${center + 68}, ${center} ${center + 68} C ${center} ${center + 68}, ${center - 35} ${center + 60}, ${center - 45} ${center + 20} L ${center - 50} ${center - 35} Z" fill="${preset.bgGradStart}" stroke="url(#ringGrad)" stroke-width="2" opacity="0.9" />`
        : preset.emblemShape === 'octagon'
          ? `<polygon points="${center - 25},${center - 55} ${center + 25},${center - 55} ${center + 55},${center - 25} ${center + 55},${center + 25} ${center + 25},${center + 55} ${center - 25},${center + 55} ${center - 55},${center + 25} ${center - 55},${center - 25}" fill="${preset.bgGradStart}" stroke="url(#ringGrad)" stroke-width="2" opacity="0.9" />`
          : `<circle cx="${center}" cy="${center}" r="${radius - 18}" fill="${preset.bgGradStart}" stroke="url(#ringGrad)" stroke-width="1.5" opacity="0.85" />`
    }
  </g>

  <!-- Monogram Initials Text -->
  <text x="${center}" y="${center + (initials.length > 2 ? 6 : 10)}" 
    font-family="${preset.fontFamily === 'serif' ? 'Georgia, Cambria, "Times New Roman", serif' : 'system-ui, -apple-system, sans-serif'}" 
    font-size="${initials.length > 2 ? size * 0.28 : size * 0.35}" 
    font-weight="800" 
    fill="${preset.textColor}" 
    text-anchor="middle" 
    letter-spacing="${initials.length > 2 ? '0' : '2'}"
    filter="url(#dropShadow)">${initials}</text>

  <!-- AI Stamp Badge -->
  <rect x="${center - 32}" y="${size - 32}" width="64" height="16" rx="8" fill="${preset.bgGradStart}" stroke="${preset.ringColor}" stroke-width="1" />
  <text x="${center}" y="${size - 21}" font-family="system-ui, sans-serif" font-size="8" font-weight="700" fill="${preset.ringColor}" text-anchor="middle" letter-spacing="1">IMAGEN AI</text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
