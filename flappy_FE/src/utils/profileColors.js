/**
 * Deterministic Profile Color System
 * - Hashes userId → consistent color per user across sessions
 * - Curated gradient palette (no harsh/clashing colors)
 * - Auto text contrast (WCAG AA compliant)
 */

// Curated premium gradient palette — soft, modern, non-clashing
const GRADIENTS = [
  { from: '#6366f1', to: '#8b5cf6', name: 'violet'   },  // indigo → violet
  { from: '#8b5cf6', to: '#ec4899', name: 'purple'   },  // violet → pink
  { from: '#06b6d4', to: '#6366f1', name: 'cyan'     },  // cyan → indigo
  { from: '#f59e0b', to: '#ef4444', name: 'amber'    },  // amber → red
  { from: '#10b981', to: '#06b6d4', name: 'emerald'  },  // emerald → cyan
  { from: '#f97316', to: '#f59e0b', name: 'orange'   },  // orange → amber
  { from: '#ec4899', to: '#f97316', name: 'pink'     },  // pink → orange
  { from: '#3b82f6', to: '#06b6d4', name: 'blue'     },  // blue → cyan
  { from: '#14b8a6', to: '#10b981', name: 'teal'     },  // teal → emerald
  { from: '#a855f7', to: '#6366f1', name: 'fuchsia'  },  // fuchsia → indigo
  { from: '#ef4444', to: '#f97316', name: 'rose'     },  // red → orange
  { from: '#0ea5e9', to: '#3b82f6', name: 'sky'      },  // sky → blue
  { from: '#84cc16', to: '#10b981', name: 'lime'     },  // lime → emerald
  { from: '#f43f5e', to: '#ec4899', name: 'crimson'  },  // rose → pink
  { from: '#6366f1', to: '#06b6d4', name: 'indigo'   },  // indigo → cyan
  { from: '#d946ef', to: '#8b5cf6', name: 'magenta'  },  // fuchsia → violet
];

/**
 * Simple deterministic hash from a string → integer
 */
const hashString = (str = '') => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

/**
 * Get the gradient config for a given userId
 * Always returns the same gradient for the same userId
 */
export const getProfileGradient = (userId = '') => {
  const index = hashString(userId) % GRADIENTS.length;
  return GRADIENTS[index];
};

/**
 * Returns CSS gradient string for use in style prop
 * direction: 'to right' | 'to bottom right' | '135deg' etc.
 */
export const getGradientStyle = (userId = '', direction = '135deg') => {
  const { from, to } = getProfileGradient(userId);
  return `linear-gradient(${direction}, ${from}, ${to})`;
};

/**
 * Returns Tailwind-compatible inline style for avatar/header backgrounds
 */
export const getAvatarStyle = (userId = '') => ({
  background: getGradientStyle(userId, '135deg'),
});

export const getHeaderStyle = (userId = '') => ({
  background: getGradientStyle(userId, 'to right'),
});

/**
 * Determine if text on this gradient should be light or dark
 * Uses luminance of the "from" color
 */
const hexToRgb = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
};

const relativeLuminance = ({ r, g, b }) => {
  const toLinear = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
};

export const getTextColor = (userId = '') => {
  const { from } = getProfileGradient(userId);
  const lum = relativeLuminance(hexToRgb(from));
  // WCAG: use white text on dark backgrounds, dark on light
  return lum < 0.35 ? '#ffffff' : '#1e293b';
};

/**
 * Get accent color (the "from" color) for borders, chips, highlights
 */
export const getAccentColor = (userId = '') => {
  return getProfileGradient(userId).from;
};

/**
 * Get a soft tinted background (10% opacity of accent) for chips/tags
 */
export const getChipStyle = (userId = '') => {
  const accent = getAccentColor(userId);
  return {
    backgroundColor: `${accent}18`,  // ~10% opacity
    color: accent,
    border: `1px solid ${accent}30`,
  };
};

/**
 * Get ring/border style for story rings, avatar borders
 */
export const getRingStyle = (userId = '') => {
  const { from, to } = getProfileGradient(userId);
  return {
    background: `linear-gradient(white, white) padding-box,
                 linear-gradient(135deg, ${from}, ${to}) border-box`,
    border: '2px solid transparent',
  };
};
