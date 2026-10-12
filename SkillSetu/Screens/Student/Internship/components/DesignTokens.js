import { Platform } from 'react-native';

export const CLAY_COLORS = {
  canvas: '#F4F1FA',
  paper: '#FFFFFF',
  foreground: '#332F3A',
  foregroundDark: '#1E1B24',
  muted: '#635F69',
  mutedLight: '#8E8A95',
  subtleBorder: 'rgba(124, 58, 237, 0.08)',
  cardBorder: 'rgba(230, 225, 242, 0.85)',
  glassBorder: 'rgba(255, 255, 255, 0.95)',
  
  // Brand Purples
  primary: '#7C3AED',
  primaryDark: '#6D28D9',
  primaryLight: '#F3E8FF',
  primaryLighter: '#FAF5FF',
  primaryGradientStart: '#A78BFA',
  primaryGradientEnd: '#7C3AED',
  
  // Accents
  secondary: '#DB2777',
  secondaryLight: '#FCE7F3',
  sky: '#0EA5E9',
  skyLight: '#E0F2FE',
  success: '#10B981',
  successLight: '#D1FAE5',
  successText: '#047857',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  warningText: '#B45309',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',

  // Surfaces
  cardBg: '#FFFFFF',
  cardBgGlass: 'rgba(255, 255, 255, 0.75)',
  recessed: '#EFEBF5',
  recessedLight: '#F8F6FC',
  recessedBorder: 'rgba(124, 58, 237, 0.12)',
  inputBg: '#EFEBF5',
  inputBorder: 'rgba(124, 58, 237, 0.14)',
  sheetBg: '#FFFFFF',
};

export const CLAY_RADII = {
  large: 48,
  hero: 36,
  card: 32,
  cardMedium: 24,
  cardSmall: 16,
  button: 20,
  input: 20,
  pill: 9999,
  full: 9999,
};

export const CLAY_SHADOWS = {
  card: Platform.select({
    web: {
      boxShadow: '16px 16px 32px rgba(160, 150, 180, 0.2), -10px -10px 24px rgba(255, 255, 255, 0.9), inset 6px 6px 12px rgba(139, 92, 246, 0.03), inset -6px -6px 12px rgba(255, 255, 255, 1)',
    },
    default: {
      shadowColor: '#7C3AED',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 14,
      elevation: 4,
    },
  }),
  cardHover: Platform.select({
    web: {
      boxShadow: '22px 22px 42px rgba(160, 150, 180, 0.28), -12px -12px 28px rgba(255, 255, 255, 0.95), inset 6px 6px 12px rgba(139, 92, 246, 0.05), inset -6px -6px 12px rgba(255, 255, 255, 1)',
    },
    default: {
      shadowColor: '#7C3AED',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.15,
      shadowRadius: 18,
      elevation: 6,
    },
  }),
  cardRecessed: Platform.select({
    web: {
      boxShadow: 'inset 6px 6px 12px #d9d4e3, inset -6px -6px 12px #ffffff',
    },
    default: {
      shadowColor: '#d9d4e3',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 1,
    },
  }),
  buttonPrimary: Platform.select({
    web: {
      boxShadow: '12px 12px 24px rgba(139, 92, 246, 0.3), -8px -8px 16px rgba(255, 255, 255, 0.4), inset 4px 4px 8px rgba(255, 255, 255, 0.4), inset -4px -4px 8px rgba(0, 0, 0, 0.1)',
    },
    default: {
      shadowColor: '#7C3AED',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.32,
      shadowRadius: 10,
      elevation: 5,
    },
  }),
  buttonPrimaryHover: Platform.select({
    web: {
      boxShadow: '16px 16px 28px rgba(139, 92, 246, 0.42), -8px -8px 18px rgba(255, 255, 255, 0.55), inset 4px 4px 8px rgba(255, 255, 255, 0.5), inset -4px -4px 8px rgba(0, 0, 0, 0.15)',
    },
    default: {
      shadowColor: '#7C3AED',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 7,
    },
  }),
  buttonPressed: Platform.select({
    web: {
      boxShadow: 'inset 10px 10px 20px #d9d4e3, inset -10px -10px 20px #ffffff',
    },
    default: {
      shadowColor: '#7C3AED',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2,
    },
  }),
  buttonSecondary: Platform.select({
    web: {
      boxShadow: '4px 4px 10px rgba(160, 150, 180, 0.12), -3px -3px 8px rgba(255, 255, 255, 0.9), inset 1px 1px 2px rgba(255, 255, 255, 0.95)',
    },
    default: {
      shadowColor: '#7C3AED',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
  }),
  buttonSecondaryHover: Platform.select({
    web: {
      boxShadow: '8px 8px 18px rgba(160, 150, 180, 0.22), -5px -5px 12px rgba(255, 255, 255, 0.95), inset 1px 1px 2px rgba(255, 255, 255, 0.95)',
    },
    default: {
      shadowColor: '#7C3AED',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
  }),
  buttonSecondaryPressed: Platform.select({
    web: {
      boxShadow: 'inset 6px 6px 14px #d9d4e3, inset -6px -6px 14px #ffffff',
    },
    default: {
      shadowColor: '#7C3AED',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 1,
    },
  }),
  pill: Platform.select({
    web: {
      boxShadow: '3px 3px 8px rgba(160, 150, 180, 0.1), -2px -2px 6px rgba(255, 255, 255, 0.9)',
    },
    default: {
      shadowColor: '#7C3AED',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 3,
      elevation: 1,
    },
  }),
  pillActive: Platform.select({
    web: {
      boxShadow: '6px 6px 16px rgba(124, 58, 237, 0.28), -3px -3px 8px rgba(255, 255, 255, 0.5), inset 2px 2px 4px rgba(255, 255, 255, 0.4)',
    },
    default: {
      shadowColor: '#7C3AED',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
      elevation: 3,
    },
  }),
  searchBar: Platform.select({
    web: {
      boxShadow: 'inset 4px 4px 10px #dcd7e8, inset -4px -4px 10px #ffffff',
    },
    default: {
      shadowColor: '#dcd7e8',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
      elevation: 1,
    },
  }),
  searchBarFocused: Platform.select({
    web: {
      boxShadow: '0 0 0 3px rgba(124, 58, 237, 0.2), inset 3px 3px 6px #e2deec, inset -3px -3px 6px #ffffff',
    },
    default: {
      shadowColor: '#7C3AED',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 2,
    },
  }),
};

export const CLAY_FONTS = {
  heading: Platform.select({
    web: '"Nunito", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    default: 'System',
  }),
  body: Platform.select({
    web: '"DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    default: 'System',
  }),
};

export const ensureClayGlobalStyles = () => {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;

  const styleId = 'skillsetu-claymorphism-styles';
  if (document.getElementById(styleId)) return;

  // 1. Google Fonts
  const fontLinkId = 'skillsetu-google-fonts';
  if (!document.getElementById(fontLinkId)) {
    const link = document.createElement('link');
    link.id = fontLinkId;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Nunito:ital,wght@0,600;0,700;0,800;0,900;1,700&display=swap';
    document.head.appendChild(link);
  }

  // 2. High-Fidelity Claymorphism Keyframes & Animations
  const style = document.createElement('style');
  style.id = styleId;
  style.innerHTML = `
    @keyframes clay-float {
      0%, 100% {
        transform: translateY(0px) rotate(0deg);
      }
      50% {
        transform: translateY(-20px) rotate(2deg);
      }
    }

    @keyframes clay-float-delayed {
      0%, 100% {
        transform: translateY(0px) rotate(0deg);
      }
      50% {
        transform: translateY(-15px) rotate(-2deg);
      }
    }

    @keyframes clay-float-slow {
      0%, 100% {
        transform: translateY(0px) rotate(0deg);
      }
      50% {
        transform: translateY(-30px) rotate(5deg);
      }
    }

    @keyframes clay-breathe {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.02);
      }
    }

    @keyframes clay-page-enter {
      0% {
        opacity: 0;
        transform: translateY(10px);
      }
      100% {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes clay-dropdown-enter {
      0% {
        opacity: 0;
        transform: translateY(-6px) scale(0.97);
      }
      100% {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes clay-card-fade-in {
      0% {
        opacity: 0;
        transform: translateY(8px);
      }
      100% {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes clay-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @keyframes clay-shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    .clay-page-enter, [class*="clay-page-enter"] {
      animation: clay-page-enter 0.6s cubic-bezier(0.25, 1, 0.5, 1) forwards;
    }

    .clay-card-stagger-1 { animation: clay-card-fade-in 0.4s ease 0ms forwards; }
    .clay-card-stagger-2 { animation: clay-card-fade-in 0.4s ease 60ms forwards; }
    .clay-card-stagger-3 { animation: clay-card-fade-in 0.4s ease 120ms forwards; }
    .clay-card-stagger-4 { animation: clay-card-fade-in 0.4s ease 180ms forwards; }
    .clay-card-stagger-5 { animation: clay-card-fade-in 0.4s ease 240ms forwards; }
    .clay-card-stagger-6 { animation: clay-card-fade-in 0.4s ease 300ms forwards; }

    .clay-interactive-card, [class*="clay-interactive-card"] {
      transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.4s ease !important;
      will-change: transform, box-shadow !important;
    }
    .clay-interactive-card:hover, [class*="clay-interactive-card"]:hover {
      transform: translateY(-4px) !important;
      box-shadow: 20px 20px 40px rgba(160, 150, 180, 0.24), -12px -12px 28px rgba(255, 255, 255, 0.95), inset 6px 6px 12px rgba(139, 92, 246, 0.04), inset -6px -6px 12px rgba(255, 255, 255, 1) !important;
    }

    .clay-btn-primary, [class*="clay-btn-primary"] {
      background: linear-gradient(135deg, #A78BFA 0%, #7C3AED 100%) !important;
      transition: transform 0.3s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.3s ease, filter 0.3s ease !important;
      cursor: pointer !important;
      min-height: 40px;
      touch-action: manipulation;
      user-select: none !important;
      will-change: transform, box-shadow !important;
    }
    .clay-btn-primary:hover, [class*="clay-btn-primary"]:hover {
      transform: translateY(-2px) !important;
      filter: brightness(1.06) !important;
      box-shadow: 16px 16px 28px rgba(139, 92, 246, 0.42), -8px -8px 18px rgba(255, 255, 255, 0.55), inset 4px 4px 8px rgba(255, 255, 255, 0.5), inset -4px -4px 8px rgba(0, 0, 0, 0.15) !important;
    }
    .clay-btn-primary:active, [class*="clay-btn-primary"]:active {
      transform: scale(0.92) !important;
      box-shadow: inset 10px 10px 20px #d9d4e3, inset -10px -10px 20px #ffffff !important;
      transition-duration: 0.12s !important;
    }

    .clay-btn-secondary, [class*="clay-btn-secondary"] {
      transition: transform 0.3s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.3s ease, background-color 0.3s ease !important;
      cursor: pointer !important;
      min-height: 40px;
      touch-action: manipulation;
      user-select: none !important;
      will-change: transform, box-shadow !important;
    }
    .clay-btn-secondary:hover, [class*="clay-btn-secondary"]:hover {
      transform: translateY(-2px) !important;
      background-color: #EDE8F7 !important;
      box-shadow: 8px 8px 18px rgba(160, 150, 180, 0.22), -5px -5px 12px rgba(255, 255, 255, 0.95), inset 1px 1px 2px rgba(255, 255, 255, 0.95) !important;
    }
    .clay-btn-secondary:active, [class*="clay-btn-secondary"]:active {
      transform: scale(0.92) !important;
      box-shadow: inset 6px 6px 14px #d9d4e3, inset -6px -6px 14px #ffffff !important;
      transition-duration: 0.12s !important;
    }

    .clay-btn-icon, [class*="clay-btn-icon"] {
      transition: transform 0.25s cubic-bezier(0.25, 1, 0.5, 1), background-color 0.25s ease !important;
      cursor: pointer !important;
      touch-action: manipulation;
      user-select: none !important;
    }
    .clay-btn-icon:hover, [class*="clay-btn-icon"]:hover {
      transform: translateY(-2px) scale(1.15) !important;
      background-color: rgba(255, 255, 255, 0.25) !important;
    }
    .clay-btn-icon:active, [class*="clay-btn-icon"]:active {
      transform: scale(0.85) !important;
      transition-duration: 0.12s !important;
    }

    .clay-chip-interactive, [class*="clay-chip-interactive"] {
      transition: transform 0.25s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.25s ease, filter 0.25s ease !important;
      cursor: pointer !important;
      user-select: none !important;
    }
    .clay-chip-interactive:hover, [class*="clay-chip-interactive"]:hover {
      transform: translateY(-2px) scale(1.03) !important;
      filter: brightness(1.03) !important;
      box-shadow: 6px 6px 14px rgba(160, 150, 180, 0.2), -3px -3px 8px rgba(255, 255, 255, 0.95) !important;
    }
    .clay-chip-interactive:active, [class*="clay-chip-interactive"]:active {
      transform: scale(0.95) !important;
      box-shadow: inset 3px 3px 8px #d9d4e3, inset -3px -3px 8px #ffffff !important;
      transition-duration: 0.12s !important;
    }

    .clay-dropdown-menu, [class*="clay-dropdown-menu"] {
      animation: clay-dropdown-enter 0.25s cubic-bezier(0.25, 1, 0.5, 1) forwards;
      transform-origin: top center;
    }

    /* Reduced Motion */
    @media (prefers-reduced-motion: reduce) {
      .clay-page-enter,
      .clay-interactive-card,
      .clay-btn-primary,
      .clay-btn-secondary,
      .clay-btn-icon,
      .clay-chip-interactive,
      .clay-dropdown-menu,
      [class*="clay-card-stagger-"] {
        animation: none !important;
        transition: none !important;
        transform: none !important;
      }
    }
  `;
  document.head.appendChild(style);
};

ensureClayGlobalStyles();

export const cleanJobDescription = (text) => {
  if (!text) return 'Explore role responsibilities, key project domains, and required technical skills.';
  let cleaned = String(text)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned || cleaned.length < 15) {
    return 'Explore full job requirements, skill matches, and team details.';
  }
  return cleaned;
};
