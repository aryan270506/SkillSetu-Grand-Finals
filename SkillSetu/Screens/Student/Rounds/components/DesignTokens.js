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
  cardBgGlass: 'rgba(255, 255, 255, 0.85)',
  recessed: '#EFEBF5',
  recessedLight: '#F8F6FC',
  recessedBorder: 'rgba(124, 58, 237, 0.12)',
  inputBg: '#F8F6FC',
  inputBorder: 'rgba(124, 58, 237, 0.14)',
  sheetBg: '#FFFFFF',
};

export const CLAY_RADII = {
  large: 48,
  hero: 36,
  card: 28,
  cardMedium: 22,
  cardSmall: 16,
  button: 20,
  input: 16,
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

export const ensureClayGlobalStyles = () => {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;

  const styleId = 'skillsetu-rounds-claymorphism-styles';
  let styleEl = document.getElementById(styleId);
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

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
  styleEl.innerHTML = `
    @keyframes clay-float {
      0%, 100% {
        transform: translateY(0px) rotate(0deg);
      }
      50% {
        transform: translateY(-16px) rotate(2deg);
      }
    }

    @keyframes clay-float-delayed {
      0%, 100% {
        transform: translateY(0px) rotate(0deg);
      }
      50% {
        transform: translateY(-12px) rotate(-2deg);
      }
    }

    @keyframes clay-float-slow {
      0%, 100% {
        transform: translateY(0px) rotate(0deg);
      }
      50% {
        transform: translateY(-20px) rotate(4deg);
      }
    }

    @keyframes clay-page-enter {
      0% {
        opacity: 0;
        transform: translateY(20px);
      }
      100% {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes clay-modal-pop {
      0% {
        opacity: 0;
        transform: translateY(20px) scale(0.94);
      }
      100% {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes clay-backdrop-fade {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes clay-dropdown-enter {
      0% {
        opacity: 0;
        transform: translateY(-8px) scale(0.97);
      }
      100% {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes clay-pulse-subtle {
      0%, 100% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.88;
        transform: scale(0.98);
      }
    }

    @keyframes clay-mic-pulse {
      0% {
        box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.6);
      }
      70% {
        box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
      }
    }

    @keyframes clay-shimmer {
      0% {
        background-position: -200% 0;
      }
      100% {
        background-position: 200% 0;
      }
    }

    .clay-rounds-container {
      font-family: ${CLAY_FONTS.body};
    }

    /* Staggered Page Entrance (supports both data-stagger and class) */
    [data-page-enter="true"], .clay-page-enter {
      animation: clay-page-enter 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    [data-stagger="1"], .clay-stagger-1 { animation: clay-page-enter 0.45s cubic-bezier(0.16, 1, 0.3, 1) 0ms both !important; }
    [data-stagger="2"], .clay-stagger-2 { animation: clay-page-enter 0.45s cubic-bezier(0.16, 1, 0.3, 1) 60ms both !important; }
    [data-stagger="3"], .clay-stagger-3 { animation: clay-page-enter 0.45s cubic-bezier(0.16, 1, 0.3, 1) 120ms both !important; }
    [data-stagger="4"], .clay-stagger-4 { animation: clay-page-enter 0.45s cubic-bezier(0.16, 1, 0.3, 1) 180ms both !important; }
    [data-stagger="5"], .clay-stagger-5 { animation: clay-page-enter 0.45s cubic-bezier(0.16, 1, 0.3, 1) 240ms both !important; }
    [data-stagger="6"], .clay-stagger-6 { animation: clay-page-enter 0.45s cubic-bezier(0.16, 1, 0.3, 1) 300ms both !important; }
    [data-stagger="7"], .clay-stagger-7 { animation: clay-page-enter 0.45s cubic-bezier(0.16, 1, 0.3, 1) 360ms both !important; }
    [data-stagger="8"], .clay-stagger-8 { animation: clay-page-enter 0.45s cubic-bezier(0.16, 1, 0.3, 1) 420ms both !important; }

    /* Interactive Cards (supports both data-card-hover and class) */
    [data-card-hover="true"], .clay-card-hover, [data-hover-lift="true"], .clay-hover-lift {
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease !important;
      will-change: transform, box-shadow !important;
    }
    [data-card-hover="true"]:hover, .clay-card-hover:hover, [data-hover-lift="true"]:hover, .clay-hover-lift:hover {
      transform: translateY(-5px) scale(1.015) !important;
      box-shadow: 22px 22px 46px rgba(160, 150, 180, 0.28), -12px -12px 28px rgba(255, 255, 255, 0.95), inset 6px 6px 12px rgba(139, 92, 246, 0.04), inset -6px -6px 12px rgba(255, 255, 255, 1) !important;
    }

    [data-subcard-hover="true"], .clay-subcard-hover {
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease, background-color 0.25s ease !important;
      will-change: transform, box-shadow !important;
    }
    [data-subcard-hover="true"]:hover, .clay-subcard-hover:hover {
      transform: translateY(-3px) scale(1.01) !important;
      box-shadow: 12px 12px 24px rgba(160, 150, 180, 0.2), -6px -6px 16px rgba(255, 255, 255, 0.9) !important;
    }

    /* Buttons */
    [data-btn-purple="true"], .clay-btn-purple {
      background: linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%) !important;
      transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s ease, filter 0.22s ease !important;
      cursor: pointer !important;
      user-select: none !important;
      will-change: transform, box-shadow !important;
    }
    [data-btn-purple="true"]:hover, .clay-btn-purple:hover {
      transform: translateY(-2px) scale(1.02) !important;
      filter: brightness(1.08) !important;
      box-shadow: 14px 14px 28px rgba(124, 58, 237, 0.42), -6px -6px 16px rgba(255, 255, 255, 0.5), inset 3px 3px 6px rgba(255, 255, 255, 0.4), inset -3px -3px 6px rgba(0, 0, 0, 0.15) !important;
    }
    [data-btn-purple="true"]:active, .clay-btn-purple:active {
      transform: scale(0.94) translateY(0) !important;
      box-shadow: inset 4px 4px 8px rgba(0, 0, 0, 0.25), inset -2px -2px 6px rgba(255, 255, 255, 0.2) !important;
      transition-duration: 0.1s !important;
    }

    [data-btn-white="true"], .clay-btn-white {
      background: #FFFFFF !important;
      transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.22s ease, background-color 0.22s ease !important;
      cursor: pointer !important;
      user-select: none !important;
      will-change: transform, box-shadow !important;
    }
    [data-btn-white="true"]:hover, .clay-btn-white:hover {
      transform: translateY(-2px) scale(1.02) !important;
      background-color: #FAF8FD !important;
      box-shadow: 8px 8px 18px rgba(160, 150, 180, 0.22), -5px -5px 12px rgba(255, 255, 255, 0.95) !important;
    }
    [data-btn-white="true"]:active, .clay-btn-white:active {
      transform: scale(0.94) translateY(0) !important;
      box-shadow: inset 3px 3px 6px #d9d4e3, inset -3px -3px 6px #ffffff !important;
      transition-duration: 0.1s !important;
    }

    [data-tab-pill="true"], .clay-tab-pill {
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s ease, box-shadow 0.2s ease, color 0.2s ease !important;
      cursor: pointer !important;
      user-select: none !important;
      will-change: transform, box-shadow !important;
    }
    [data-tab-pill="true"]:hover, .clay-tab-pill:hover {
      transform: translateY(-2px) !important;
    }
    [data-tab-pill="true"]:active, .clay-tab-pill:active {
      transform: scale(0.95) translateY(0) !important;
    }

    /* Modal Animation */
    [data-modal-enter="true"], .clay-modal-enter {
      animation: clay-modal-pop 0.32s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    [data-backdrop-fade="true"], .clay-backdrop-fade {
      animation: clay-backdrop-fade 0.22s ease forwards;
    }
    [data-dropdown-enter="true"], .clay-dropdown-enter {
      animation: clay-dropdown-enter 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    /* Interactive Icons & Action Controls */
    [data-icon-interactive="true"], .clay-icon-interactive {
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease !important;
      cursor: pointer !important;
    }
    [data-icon-interactive="true"]:hover, .clay-icon-interactive:hover {
      transform: scale(1.15) rotate(5deg) !important;
    }
    [data-icon-interactive="true"]:active, .clay-icon-interactive:active {
      transform: scale(0.9) !important;
    }

    [data-close-btn="true"], .clay-close-btn {
      transition: transform 0.25s ease, background-color 0.2s ease !important;
      cursor: pointer !important;
    }
    [data-close-btn="true"]:hover, .clay-close-btn:hover {
      transform: rotate(90deg) scale(1.1) !important;
      background-color: #F3E8FF !important;
    }

    [data-recording-pulse="true"], .clay-recording-pulse {
      animation: clay-mic-pulse 1.4s infinite !important;
    }

    /* Smooth Progress Bar Transitions */
    [data-progress-bar="true"], .clay-progress-bar-fill {
      transition: width 0.85s cubic-bezier(0.16, 1, 0.3, 1) !important;
    }

    /* Skeletons & Shimmer */
    [data-skeleton="true"], .clay-skeleton {
      background: linear-gradient(90deg, #EFEBF5 25%, #F8F6FC 50%, #EFEBF5 75%);
      background-size: 200% 100%;
      animation: clay-shimmer 1.8s infinite;
      border-radius: 8px;
    }

    @media (prefers-reduced-motion: reduce) {
      [data-card-hover="true"]:hover, .clay-card-hover:hover,
      [data-btn-purple="true"]:hover, .clay-btn-purple:hover,
      [data-btn-white="true"]:hover, .clay-btn-white:hover {
        transform: none !important;
      }
    }
  `;
};

// Ensure styles are immediately injected on load
ensureClayGlobalStyles();

