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
  
  // Brand Purples & Violets
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
  skyDark: '#0284C7',
  success: '#10B981',
  successLight: '#D1FAE5',
  successDark: '#047857',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  warningDark: '#B45309',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',

  // Surfaces
  cardBg: '#FFFFFF',
  cardBgGlass: 'rgba(255, 255, 255, 0.92)',
  recessed: '#EFEBF5',
  recessedLight: '#F8F6FC',
  recessedBorder: 'rgba(124, 58, 237, 0.12)',
  inputBg: '#F8F6FC',
  inputBorder: 'rgba(124, 58, 237, 0.14)',
  sheetBg: '#FFFFFF',
};

export const CLAY_RADII = {
  large: 48,
  hero: 32,
  card: 26,
  cardMedium: 20,
  cardSmall: 14,
  button: 16,
  input: 14,
  pill: 9999,
  full: 9999,
};

export const CLAY_SHADOWS = {
  card: Platform.select({
    web: {
      boxShadow: '16px 16px 32px rgba(160, 150, 180, 0.18), -10px -10px 24px rgba(255, 255, 255, 0.9), inset 6px 6px 12px rgba(139, 92, 246, 0.03), inset -6px -6px 12px rgba(255, 255, 255, 1)',
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
      boxShadow: '22px 22px 42px rgba(160, 150, 180, 0.26), -12px -12px 28px rgba(255, 255, 255, 0.95), inset 6px 6px 12px rgba(139, 92, 246, 0.05), inset -6px -6px 12px rgba(255, 255, 255, 1)',
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
      boxShadow: 'inset 4px 4px 10px #d9d4e3, inset -4px -4px 10px #ffffff',
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
      boxShadow: '10px 10px 20px rgba(139, 92, 246, 0.3), -6px -6px 14px rgba(255, 255, 255, 0.4), inset 3px 3px 6px rgba(255, 255, 255, 0.4), inset -3px -3px 6px rgba(0, 0, 0, 0.12)',
    },
    default: {
      shadowColor: '#7C3AED',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.32,
      shadowRadius: 10,
      elevation: 5,
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
  badge: Platform.select({
    web: {
      boxShadow: '2px 2px 6px rgba(160, 150, 180, 0.1), -2px -2px 4px rgba(255, 255, 255, 0.8)',
    },
    default: {
      shadowColor: '#7C3AED',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
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

export const ensureProfileGlobalStyles = () => {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;

  const styleId = 'skillsetu-profile-claymorphism-styles';
  let styleEl = document.getElementById(styleId);
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  // Google Fonts
  const fontLinkId = 'skillsetu-google-fonts';
  if (!document.getElementById(fontLinkId)) {
    const link = document.createElement('link');
    link.id = fontLinkId;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Nunito:ital,wght@0,600;0,700;0,800;0,900;1,700&display=swap';
    document.head.appendChild(link);
  }

  styleEl.innerHTML = `
    @keyframes profile-float {
      0%, 100% {
        transform: translateY(0px) rotate(0deg);
      }
      50% {
        transform: translateY(-14px) rotate(2deg);
      }
    }

    @keyframes profile-float-slow {
      0%, 100% {
        transform: translateY(0px) rotate(0deg);
      }
      50% {
        transform: translateY(-18px) rotate(-3deg);
      }
    }

    @keyframes profile-page-enter {
      0% {
        opacity: 0;
        transform: translateY(22px);
      }
      100% {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes profile-hero-avatar-enter {
      0% {
        opacity: 0;
        transform: scale(0.82);
      }
      100% {
        opacity: 1;
        transform: scale(1);
      }
    }

    @keyframes profile-hero-info-enter {
      0% {
        opacity: 0;
        transform: translateX(-14px);
      }
      100% {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @keyframes profile-hero-actions-enter {
      0% {
        opacity: 0;
        transform: translateY(-10px);
      }
      100% {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes profile-modal-pop {
      0% {
        opacity: 0;
        transform: translateY(20px) scale(0.94);
      }
      100% {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes profile-backdrop-fade {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes profile-shimmer {
      0% {
        background-position: -200% 0;
      }
      100% {
        background-position: 200% 0;
      }
    }

    @keyframes profile-pulse-glow {
      0%, 100% {
        box-shadow: 0 0 0 0 rgba(124, 58, 237, 0.35);
      }
      50% {
        box-shadow: 0 0 0 8px rgba(124, 58, 237, 0);
      }
    }

    .clay-hero-animated {
      animation: profile-page-enter 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .clay-hero-avatar {
      animation: profile-hero-avatar-enter 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .clay-hero-info {
      animation: profile-hero-info-enter 0.6s 0.1s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    .clay-hero-actions {
      animation: profile-hero-actions-enter 0.6s 0.2s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    .clay-section-revealed {
      animation: profile-page-enter 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .clay-modal-content {
      animation: profile-modal-pop 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .clay-modal-backdrop {
      animation: profile-backdrop-fade 0.25s ease-out forwards;
    }

    /* Clay interactive hover classes for DOM elements */
    .clay-hover-lift {
      transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.28s cubic-bezier(0.16, 1, 0.3, 1) !important;
    }

    .clay-hover-lift:hover {
      transform: translateY(-4px) scale(1.01) !important;
      box-shadow: 22px 22px 42px rgba(160, 150, 180, 0.26), -12px -12px 28px rgba(255, 255, 255, 0.95), inset 6px 6px 12px rgba(139, 92, 246, 0.05), inset -6px -6px 12px rgba(255, 255, 255, 1) !important;
    }

    .clay-hover-lift:active {
      transform: translateY(-1px) scale(0.99) !important;
    }

    .clay-btn-interactive {
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease !important;
      cursor: pointer;
    }

    .clay-btn-interactive:hover {
      transform: translateY(-2px) scale(1.02) !important;
    }

    .clay-btn-interactive:active {
      transform: translateY(1px) scale(0.96) !important;
    }

    .clay-chip-interactive {
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.25s ease, background-color 0.25s ease !important;
    }

    .clay-chip-interactive:hover {
      transform: translateY(-3px) scale(1.02) !important;
      border-color: rgba(124, 58, 237, 0.35) !important;
    }

    @media (prefers-reduced-motion: reduce) {
      .clay-hero-animated,
      .clay-hero-avatar,
      .clay-hero-info,
      .clay-hero-actions,
      .clay-section-revealed,
      .clay-modal-content,
      .clay-hover-lift,
      .clay-btn-interactive,
      .clay-chip-interactive {
        animation: none !important;
        transition: opacity 0.15s ease !important;
        transform: none !important;
      }
    }
  `;
};
