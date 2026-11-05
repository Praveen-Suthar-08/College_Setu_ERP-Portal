import React from 'react';

export type AvatarCategory =
  | 'All Avatars'
  | 'Professional'
  | 'Students'
  | 'Faculty'
  | 'Illustrations'
  | 'Minimal'
  | 'Abstract'
  | 'Initials';

export const AVATAR_CATEGORIES: AvatarCategory[] = [
  'All Avatars',
  'Professional',
  'Students',
  'Faculty',
  'Illustrations',
  'Minimal',
  'Abstract',
  'Initials',
];

export interface BuiltInAvatarItem {
  id: string;
  label: string;
  category: Exclude<AvatarCategory, 'All Avatars'>;
  bgPrimary: string;
  bgSecondary: string;
  accent: string;
  skinTone?: string;
  hairColor?: string;
  outfitColor?: string;
  accessories?: 'glasses' | 'graduation_cap' | 'tie' | 'headset' | 'badge' | 'none';
  variant:
    | 'portrait_exec'
    | 'portrait_scholar'
    | 'portrait_faculty'
    | 'portrait_creative'
    | 'minimal_crest'
    | 'minimal_orbit'
    | 'abstract_prism'
    | 'abstract_waves'
    | 'initials_badge';
}

export const BUILT_IN_AVATARS: BuiltInAvatarItem[] = [
  // PROFESSIONAL (Executive & Administrative Portraits)
  {
    id: 'prof-exec-navy',
    label: 'Executive Dean · Navy',
    category: 'Professional',
    bgPrimary: '#172554',
    bgSecondary: '#2448C8',
    accent: '#93C5FD',
    skinTone: '#F3C6A5',
    hairColor: '#1E293B',
    outfitColor: '#0F172A',
    accessories: 'tie',
    variant: 'portrait_exec',
  },
  {
    id: 'prof-director-indigo',
    label: 'Operations Director · Indigo',
    category: 'Professional',
    bgPrimary: '#312E81',
    bgSecondary: '#4F46E5',
    accent: '#C7D2FE',
    skinTone: '#E0AC8B',
    hairColor: '#27272A',
    outfitColor: '#1E1B4B',
    accessories: 'glasses',
    variant: 'portrait_exec',
  },
  {
    id: 'prof-registrar-slate',
    label: 'Academic Registrar · Slate',
    category: 'Professional',
    bgPrimary: '#0F172A',
    bgSecondary: '#334155',
    accent: '#38BDF8',
    skinTone: '#C68B59',
    hairColor: '#090D16',
    outfitColor: '#1E293B',
    accessories: 'badge',
    variant: 'portrait_exec',
  },
  {
    id: 'prof-counselor-teal',
    label: 'Institutional Lead · Teal',
    category: 'Professional',
    bgPrimary: '#115E59',
    bgSecondary: '#0D9488',
    accent: '#99F6E4',
    skinTone: '#F7D3BA',
    hairColor: '#451A03',
    outfitColor: '#134E4A',
    accessories: 'none',
    variant: 'portrait_exec',
  },

  // STUDENTS (Modern Scholars & Graduates)
  {
    id: 'stu-scholar-blue',
    label: 'Honors Scholar · Royal Blue',
    category: 'Students',
    bgPrimary: '#1E40AF',
    bgSecondary: '#3B82F6',
    accent: '#DBEAFE',
    skinTone: '#F1C27D',
    hairColor: '#1C1917',
    outfitColor: '#172554',
    accessories: 'graduation_cap',
    variant: 'portrait_scholar',
  },
  {
    id: 'stu-eng-indigo',
    label: 'CS Undergrad · Indigo',
    category: 'Students',
    bgPrimary: '#3730A3',
    bgSecondary: '#6366F1',
    accent: '#E0E7FF',
    skinTone: '#E0AC69',
    hairColor: '#292524',
    outfitColor: '#312E81',
    accessories: 'headset',
    variant: 'portrait_scholar',
  },
  {
    id: 'stu-research-emerald',
    label: 'Research Fellow · Emerald',
    category: 'Students',
    bgPrimary: '#065F46',
    bgSecondary: '#10B981',
    accent: '#D1FAE5',
    skinTone: '#C68642',
    hairColor: '#0F172A',
    outfitColor: '#064E3B',
    accessories: 'glasses',
    variant: 'portrait_scholar',
  },
  {
    id: 'stu-design-sky',
    label: 'Campus Leader · Sky',
    category: 'Students',
    bgPrimary: '#0369A1',
    bgSecondary: '#0EA5E9',
    accent: '#E0F2FE',
    skinTone: '#FFDBAC',
    hairColor: '#57534E',
    outfitColor: '#0C4A6E',
    accessories: 'none',
    variant: 'portrait_scholar',
  },

  // FACULTY (Professors, Mentors & Department Heads)
  {
    id: 'fac-prof-navy',
    label: 'Senior Professor · Navy',
    category: 'Faculty',
    bgPrimary: '#1E3A8A',
    bgSecondary: '#2563EB',
    accent: '#BFDBFE',
    skinTone: '#E5B887',
    hairColor: '#475569',
    outfitColor: '#0F172A',
    accessories: 'glasses',
    variant: 'portrait_faculty',
  },
  {
    id: 'fac-hod-amber',
    label: 'Department Chair · Amber',
    category: 'Faculty',
    bgPrimary: '#78350F',
    bgSecondary: '#D97706',
    accent: '#FEF3C7',
    skinTone: '#C68B59',
    hairColor: '#1E293B',
    outfitColor: '#451A03',
    accessories: 'tie',
    variant: 'portrait_faculty',
  },
  {
    id: 'fac-mentor-violet',
    label: 'Faculty Mentor · Violet',
    category: 'Faculty',
    bgPrimary: '#4C1D95',
    bgSecondary: '#7C3AED',
    accent: '#EDE9FE',
    skinTone: '#F5CBA7',
    hairColor: '#31102F',
    outfitColor: '#2E1065',
    accessories: 'glasses',
    variant: 'portrait_faculty',
  },
  {
    id: 'fac-lecturer-cyan',
    label: 'Lab Coordinator · Cyan',
    category: 'Faculty',
    bgPrimary: '#155E75',
    bgSecondary: '#0891B2',
    accent: '#CFFAFE',
    skinTone: '#D4A373',
    hairColor: '#18181B',
    outfitColor: '#083344',
    accessories: 'badge',
    variant: 'portrait_faculty',
  },

  // ILLUSTRATIONS (Stylized Modern SaaS Characters)
  {
    id: 'ill-innovator-blue',
    label: 'Digital Innovator',
    category: 'Illustrations',
    bgPrimary: '#2448C8',
    bgSecondary: '#60A5FA',
    accent: '#EFF6FF',
    skinTone: '#FDE68A',
    hairColor: '#1E3A8A',
    outfitColor: '#172554',
    accessories: 'glasses',
    variant: 'portrait_creative',
  },
  {
    id: 'ill-architect-indigo',
    label: 'Systems Architect',
    category: 'Illustrations',
    bgPrimary: '#4338CA',
    bgSecondary: '#818CF8',
    accent: '#EEF2FF',
    skinTone: '#FED7AA',
    hairColor: '#312E81',
    outfitColor: '#1E1B4B',
    accessories: 'headset',
    variant: 'portrait_creative',
  },
  {
    id: 'ill-curator-emerald',
    label: 'Academic Curator',
    category: 'Illustrations',
    bgPrimary: '#047857',
    bgSecondary: '#34D399',
    accent: '#ECFDF5',
    skinTone: '#FDE047',
    hairColor: '#064E3B',
    outfitColor: '#022C22',
    accessories: 'graduation_cap',
    variant: 'portrait_creative',
  },
  {
    id: 'ill-visionary-rose',
    label: 'Campus Visionary',
    category: 'Illustrations',
    bgPrimary: '#9D174D',
    bgSecondary: '#F43F5E',
    accent: '#FFF1F2',
    skinTone: '#FECDD3',
    hairColor: '#500724',
    outfitColor: '#881337',
    accessories: 'none',
    variant: 'portrait_creative',
  },

  // MINIMAL (Clean Institutional Crests & Monoline Symbols)
  {
    id: 'min-crest-navy',
    label: 'Institutional Crest · Navy',
    category: 'Minimal',
    bgPrimary: '#172554',
    bgSecondary: '#1E3A8A',
    accent: '#93C5FD',
    variant: 'minimal_crest',
  },
  {
    id: 'min-crest-blue',
    label: 'Academic Shield · Royal',
    category: 'Minimal',
    bgPrimary: '#2448C8',
    bgSecondary: '#3B82F6',
    accent: '#FFFFFF',
    variant: 'minimal_crest',
  },
  {
    id: 'min-orbit-indigo',
    label: 'Atomic Orbit · Indigo',
    category: 'Minimal',
    bgPrimary: '#312E81',
    bgSecondary: '#4F46E5',
    accent: '#C7D2FE',
    variant: 'minimal_orbit',
  },
  {
    id: 'min-orbit-slate',
    label: 'Precision Node · Slate',
    category: 'Minimal',
    bgPrimary: '#0F172A',
    bgSecondary: '#1E293B',
    accent: '#38BDF8',
    variant: 'minimal_orbit',
  },

  // ABSTRACT (Geometric SaaS Gradients & Architectural Shapes)
  {
    id: 'abs-prism-royal',
    label: 'Prism Geometry · Blue',
    category: 'Abstract',
    bgPrimary: '#172554',
    bgSecondary: '#2448C8',
    accent: '#60A5FA',
    variant: 'abstract_prism',
  },
  {
    id: 'abs-prism-indigo',
    label: 'Prism Geometry · Indigo',
    category: 'Abstract',
    bgPrimary: '#312E81',
    bgSecondary: '#6366F1',
    accent: '#A5B4FC',
    variant: 'abstract_prism',
  },
  {
    id: 'abs-waves-teal',
    label: 'Meridian Waves · Teal',
    category: 'Abstract',
    bgPrimary: '#0F766E',
    bgSecondary: '#14B8A6',
    accent: '#99F6E4',
    variant: 'abstract_waves',
  },
  {
    id: 'abs-waves-sky',
    label: 'Horizon Waves · Sky',
    category: 'Abstract',
    bgPrimary: '#0369A1',
    bgSecondary: '#0284C7',
    accent: '#BAE6FD',
    variant: 'abstract_waves',
  },

  // INITIALS (Personalized Monogram Avatars)
  {
    id: 'init-navy',
    label: 'Monogram · Classic Navy',
    category: 'Initials',
    bgPrimary: '#172554',
    bgSecondary: '#1E3A8A',
    accent: '#FFFFFF',
    variant: 'initials_badge',
  },
  {
    id: 'init-royal',
    label: 'Monogram · Primary Blue',
    category: 'Initials',
    bgPrimary: '#2448C8',
    bgSecondary: '#3B82F6',
    accent: '#FFFFFF',
    variant: 'initials_badge',
  },
  {
    id: 'init-indigo',
    label: 'Monogram · Executive Indigo',
    category: 'Initials',
    bgPrimary: '#4F46E5',
    bgSecondary: '#6366F1',
    accent: '#FFFFFF',
    variant: 'initials_badge',
  },
  {
    id: 'init-emerald',
    label: 'Monogram · Verified Emerald',
    category: 'Initials',
    bgPrimary: '#15803D',
    bgSecondary: '#16A34A',
    accent: '#FFFFFF',
    variant: 'initials_badge',
  },
];

export function getInitialsFromName(name: string): string {
  if (!name || !name.trim()) return 'CP';
  return (
    name
      .split(' ')
      .filter((p) => p && !p.startsWith('('))
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase() || 'CP'
  );
}

export const BuiltInAvatarGraphic: React.FC<{
  avatarId?: string;
  name: string;
  className?: string;
}> = ({ avatarId, name, className = 'h-full w-full' }) => {
  const item =
    BUILT_IN_AVATARS.find((a) => a.id === avatarId) || BUILT_IN_AVATARS[0];
  const initials = getInitialsFromName(name);
  const gradId = `av-grad-${item.id}-${initials}`;

  if (item.variant === 'initials_badge') {
    return (
      <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={item.bgPrimary} />
            <stop offset="100%" stopColor={item.bgSecondary} />
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="50" fill={`url(#${gradId})`} />
        <circle
          cx="50"
          cy="50"
          r="43"
          fill="none"
          stroke={item.accent}
          strokeOpacity="0.22"
          strokeWidth="1.5"
        />
        <text
          x="50"
          y="53"
          textAnchor="middle"
          dominantBaseline="middle"
          fill={item.accent}
          fontFamily="JetBrains Mono, Plus Jakarta Sans, sans-serif"
          fontWeight="700"
          fontSize="34"
          letterSpacing="1"
        >
          {initials}
        </text>
      </svg>
    );
  }

  if (item.variant === 'minimal_crest') {
    return (
      <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
        <rect width="100" height="100" rx="50" fill={item.bgPrimary} />
        <circle cx="50" cy="50" r="38" fill={item.bgSecondary} fillOpacity="0.55" />
        <path
          d="M50 22 L72 32 V50 C72 66 62 76 50 82 C38 76 28 66 28 50 V32 L50 22 Z"
          fill="none"
          stroke={item.accent}
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        <path
          d="M50 32 V70 M36 46 H64"
          stroke={item.accent}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeOpacity="0.8"
        />
      </svg>
    );
  }

  if (item.variant === 'minimal_orbit') {
    return (
      <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
        <rect width="100" height="100" rx="50" fill={item.bgPrimary} />
        <ellipse
          cx="50"
          cy="50"
          rx="32"
          ry="14"
          transform="rotate(-30 50 50)"
          fill="none"
          stroke={item.accent}
          strokeWidth="2.5"
        />
        <ellipse
          cx="50"
          cy="50"
          rx="32"
          ry="14"
          transform="rotate(30 50 50)"
          fill="none"
          stroke={item.accent}
          strokeWidth="2.5"
          strokeOpacity="0.7"
        />
        <circle cx="50" cy="50" r="8" fill={item.accent} />
      </svg>
    );
  }

  if (item.variant === 'abstract_prism') {
    return (
      <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
        <rect width="100" height="100" rx="50" fill={item.bgPrimary} />
        <polygon points="50,16 82,74 18,74" fill={item.bgSecondary} />
        <polygon points="50,16 82,74 50,62" fill={item.accent} fillOpacity="0.85" />
        <circle cx="50" cy="46" r="9" fill="#FFFFFF" fillOpacity="0.9" />
      </svg>
    );
  }

  if (item.variant === 'abstract_waves') {
    return (
      <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
        <rect width="100" height="100" rx="50" fill={item.bgPrimary} />
        <path
          d="M0 60 Q25 45 50 60 T100 60 L100 100 L0 100 Z"
          fill={item.bgSecondary}
        />
        <path
          d="M0 74 Q25 60 50 74 T100 74 L100 100 L0 100 Z"
          fill={item.accent}
          fillOpacity="0.75"
        />
        <circle cx="68" cy="34" r="11" fill={item.accent} />
      </svg>
    );
  }

  // Portrait variants (Professional, Students, Faculty, Illustrations)
  const skin = item.skinTone || '#F1C27D';
  const hair = item.hairColor || '#1E293B';
  const outfit = item.outfitColor || '#0F172A';

  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={item.bgPrimary} />
          <stop offset="100%" stopColor={item.bgSecondary} />
        </linearGradient>
        <clipPath id={`clip-${gradId}`}>
          <circle cx="50" cy="50" r="50" />
        </clipPath>
      </defs>
      <g clipPath={`url(#clip-${gradId})`}>
        <rect width="100" height="100" fill={`url(#${gradId})`} />
        <circle cx="82" cy="20" r="24" fill={item.accent} fillOpacity="0.12" />

        {/* Shoulders / Blazer */}
        <path
          d="M16 102 C16 77 32 68 50 68 C68 68 84 77 84 102 Z"
          fill={outfit}
        />
        {/* Collar / Shirt */}
        <polygon points="41,68 50,84 59,68" fill="#FFFFFF" fillOpacity="0.92" />

        {item.accessories === 'tie' && (
          <polygon points="48,74 52,74 54,96 50,100 46,96" fill={item.accent} />
        )}
        {item.accessories === 'badge' && (
          <rect x="60" y="78" width="10" height="6" rx="1.5" fill={item.accent} />
        )}

        {/* Neck */}
        <rect x="44" y="56" width="12" height="16" rx="5" fill={skin} />

        {/* Head */}
        <circle cx="50" cy="43" r="18" fill={skin} />

        {/* Hair */}
        {item.variant === 'portrait_scholar' ? (
          <path
            d="M31 41 C31 25 40 21 50 21 C62 21 69 27 69 41 C65 33 58 30 50 30 C41 30 35 34 31 41 Z"
            fill={hair}
          />
        ) : (
          <path
            d="M32 43 C31 26 39 22 50 22 C61 22 69 26 68 43 C65 34 59 31 50 31 C41 31 35 34 32 43 Z"
            fill={hair}
          />
        )}

        {/* Eyes & Smile */}
        <circle cx="43.5" cy="43" r="2" fill="#1E293B" />
        <circle cx="56.5" cy="43" r="2" fill="#1E293B" />
        <path
          d="M44.5 50.5 Q50 55 55.5 50.5"
          fill="none"
          stroke="#1E293B"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Glasses accessory */}
        {item.accessories === 'glasses' && (
          <g stroke={item.accent} strokeWidth="2" fill="none">
            <rect x="37.5" y="39" width="11" height="8" rx="2.5" />
            <rect x="51.5" y="39" width="11" height="8" rx="2.5" />
            <line x1="48.5" y1="43" x2="51.5" y2="43" />
          </g>
        )}

        {/* Graduation Cap accessory */}
        {item.accessories === 'graduation_cap' && (
          <g>
            <polygon points="50,14 76,24 50,33 24,24" fill="#0F172A" />
            <rect x="37" y="29" width="26" height="5" rx="2" fill="#1E293B" />
            <path d="M70 25 V37" stroke="#FBBF24" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="70" cy="38" r="2" fill="#FBBF24" />
          </g>
        )}

        {/* Headset accessory */}
        {item.accessories === 'headset' && (
          <g>
            <path
              d="M31 44 C31 28 69 28 69 44"
              fill="none"
              stroke={item.accent}
              strokeWidth="3"
            />
            <rect x="28" y="40" width="5" height="10" rx="2.5" fill={item.accent} />
            <rect x="67" y="40" width="5" height="10" rx="2.5" fill={item.accent} />
          </g>
        )}
      </g>
    </svg>
  );
};
