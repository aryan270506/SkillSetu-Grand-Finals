import React, { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

/**
 * Universally Reliable Claymorphic Interactive Button
 * Combines React Native Web hovered/pressed callback + DOM mouse events + inline CSS transforms
 */
export function ClayButton({
  style,
  onPress,
  disabled,
  children,
  hoverTranslate = -4,
  hoverScale = 1.025,
  pressScale = 0.96,
  testID,
  dataSet,
  ...props
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  return (
    <Pressable
      testID={testID}
      dataSet={dataSet}
      {...props}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      onMouseEnter={(e) => {
        if (props.onMouseEnter) props.onMouseEnter(e);
        if (!disabled) setIsHovered(true);
      }}
      onMouseLeave={(e) => {
        if (props.onMouseLeave) props.onMouseLeave(e);
        setIsHovered(false);
        setIsPressed(false);
      }}
      onMouseDown={(e) => {
        if (props.onMouseDown) props.onMouseDown(e);
        if (!disabled) setIsPressed(true);
      }}
      onMouseUp={(e) => {
        if (props.onMouseUp) props.onMouseUp(e);
        setIsPressed(false);
      }}
      style={({ hovered, pressed }) => {
        const activeHover = (isHovered || hovered) && !disabled;
        const activePress = (isPressed || pressed) && !disabled;
        return [
          style,
          Platform.OS === 'web' && {
            cursor: disabled ? 'not-allowed' : 'pointer',
            userSelect: 'none',
            transform: [
              { translateY: activePress ? 1 : activeHover ? hoverTranslate : 0 },
              { scale: activePress ? pressScale : activeHover ? hoverScale : 1 },
            ],
            transitionDuration: '220ms',
            transitionProperty: 'transform, box-shadow, background-color, border-color, opacity',
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: activeHover
              ? '0 12px 28px rgba(124, 58, 237, 0.32)'
              : undefined,
          },
        ];
      }}
    >
      {children}
    </Pressable>
  );
}

/**
 * Universally Reliable Claymorphic Interactive Card
 */
export function ClayCard({
  style,
  children,
  onPress,
  hoverTranslate = -4,
  hoverScale = 1.01,
  pressScale = 0.985,
  interactive = true,
  ...props
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  if (!interactive && !onPress) {
    return <View style={style} {...props}>{children}</View>;
  }

  return (
    <Pressable
      {...props}
      onPress={onPress}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onMouseDown={() => onPress && setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      style={({ hovered, pressed }) => {
        const activeHover = isHovered || hovered;
        const activePress = isPressed || pressed;
        return [
          style,
          Platform.OS === 'web' && {
            cursor: onPress ? 'pointer' : 'default',
            transform: [
              { translateY: (activePress && onPress) ? 1 : activeHover ? hoverTranslate : 0 },
              { scale: (activePress && onPress) ? pressScale : activeHover ? hoverScale : 1 },
            ],
            transitionDuration: '250ms',
            transitionProperty: 'transform, box-shadow, border-color',
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          },
        ];
      }}
    >
      {children}
    </Pressable>
  );
}

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
  
  // Accents matching guidelines & Screenshot 3
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
  cardBgGlass: 'rgba(255, 255, 255, 0.94)',
  recessed: '#EFEBF5',
  recessedLight: '#F8F6FC',
  recessedBorder: 'rgba(124, 58, 237, 0.12)',
  inputBg: '#F8F6FC',
  inputBorder: 'rgba(124, 58, 237, 0.14)',
  sheetBg: '#FFFFFF',
};

export const CLAY_RADII = {
  large: 40,
  hero: 28,
  card: 24,
  cardMedium: 18,
  cardSmall: 14,
  button: 14,
  input: 12,
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

export const ensureSkillGlobalStyles = () => {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;

  const styleId = 'skillsetu-skill-claymorphism-styles';
  let styleEl = document.getElementById(styleId);

  if (!styleEl) {
    // Inject Google Fonts for Nunito & DM Sans
    const fontLinkId = 'skillsetu-skill-google-fonts';
    if (!document.getElementById(fontLinkId)) {
      const link = document.createElement('link');
      link.id = fontLinkId;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Nunito:ital,wght@0,200..1000;1,200..1000&display=swap';
      document.head.appendChild(link);
    }

    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  styleEl.innerHTML = `
    /* ============================================================ */
    /* SKILL ASSESSMENT POPUP MODAL SHELL (WEB)                     */
    /* ============================================================ */
    .skill-assessment-modal-overlay {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background-color: rgba(25, 22, 32, 0.75) !important;
      backdrop-filter: blur(6px) !important;
      -webkit-backdrop-filter: blur(6px) !important;
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      z-index: 999999 !important;
      padding: 16px !important;
      box-sizing: border-box !important;
      opacity: 0 !important;
      visibility: hidden !important;
      pointer-events: none !important;
      transition: opacity 320ms cubic-bezier(0.16, 1, 0.3, 1), visibility 320ms cubic-bezier(0.16, 1, 0.3, 1) !important;
    }

    .skill-assessment-modal-overlay.is-open {
      opacity: 1 !important;
      visibility: visible !important;
      pointer-events: auto !important;
    }

    .skill-assessment-modal-card {
      background-color: #FFFFFF !important;
      border-radius: 24px !important;
      max-width: 780px !important;
      width: 100% !important;
      height: 88% !important;
      max-height: 740px !important;
      border: 1.5px solid rgba(230, 225, 242, 0.85) !important;
      box-shadow: 22px 22px 42px rgba(160, 150, 180, 0.26), -12px -12px 28px rgba(255, 255, 255, 0.95) !important;
      display: flex !important;
      flex-direction: column !important;
      overflow: hidden !important;
      opacity: 0 !important;
      transform: translate3d(0, 50px, 0) scale(0.88) !important;
      transition: opacity 450ms cubic-bezier(0.16, 1, 0.3, 1), transform 450ms cubic-bezier(0.16, 1, 0.3, 1) !important;
      will-change: opacity, transform !important;
    }

    .skill-assessment-modal-overlay.is-open .skill-assessment-modal-card {
      opacity: 1 !important;
      transform: translate3d(0, 0, 0) scale(1) !important;
    }

    @media (max-width: 640px) {
      .skill-assessment-modal-card {
        height: 96% !important;
        max-height: 96% !important;
        border-radius: 18px !important;
      }
    }

    /* ============================================================ */
    /* KEYFRAME ANIMATIONS                                          */
    /* ============================================================ */
    @keyframes skillModalBackdropFadeIn {
      0% { opacity: 0; }
      100% { opacity: 1; }
    }

    @keyframes skillModalBackdropFadeOut {
      0% { opacity: 1; }
      100% { opacity: 0; }
    }

    @keyframes skillModalCardEntrance {
      0% {
        opacity: 0;
        transform: scale(0.72) translateY(80px);
      }
      65% {
        opacity: 1;
        transform: scale(1.02) translateY(-4px);
      }
      100% {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    @keyframes skillModalCardExit {
      0% {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
      100% {
        opacity: 0;
        transform: scale(0.80) translateY(60px);
      }
    }

    @keyframes skillQuestionSlideIn {
      0% {
        opacity: 0;
        transform: translateY(18px) scale(0.98);
      }
      100% {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes skillOptionStaggerIn {
      0% {
        opacity: 0;
        transform: translateY(14px);
      }
      100% {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes skillRadioCheckPop {
      0% { transform: scale(0.7); }
      60% { transform: scale(1.25); }
      100% { transform: scale(1); }
    }

    @keyframes skillSpinnerRotate {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    @keyframes skillResultBounceIn {
      0% {
        opacity: 0;
        transform: scale(0.78) translateY(28px);
      }
      60% {
        opacity: 1;
        transform: scale(1.03) translateY(-4px);
      }
      100% {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    @keyframes clay-fade-in-up {
      0% {
        opacity: 0;
        transform: translateY(18px);
      }
      100% {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes clay-scale-pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.02); }
      100% { transform: scale(1); }
    }

    @keyframes clay-float {
      0% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(-16px) rotate(2deg); }
      100% { transform: translateY(0px) rotate(0deg); }
    }

    @keyframes clay-float-delayed {
      0% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(18px) rotate(-2deg); }
      100% { transform: translateY(0px) rotate(0deg); }
    }

    @keyframes clay-float-slow {
      0% { transform: translateY(0px) scale(1); }
      50% { transform: translateY(-12px) scale(1.03); }
      100% { transform: translateY(0px) scale(1); }
    }

    /* ============================================================ */
    /* MODAL INTERACTION & TRANSITION CLASSES                       */
    /* ============================================================ */
    .skill-modal-overlay-entering {
      animation: skillModalBackdropFadeIn 350ms cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
      backdrop-filter: blur(6px) !important;
      -webkit-backdrop-filter: blur(6px) !important;
    }

    .skill-modal-overlay-exiting {
      animation: skillModalBackdropFadeOut 260ms cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
    }

    .skill-modal-card-entering {
      animation: skillModalCardEntrance 450ms cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
      will-change: transform, opacity !important;
    }

    .skill-modal-card-exiting {
      animation: skillModalCardExit 260ms cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
      will-change: transform, opacity !important;
    }

    .skill-question-entering {
      animation: skillQuestionSlideIn 320ms cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
      will-change: transform, opacity !important;
    }

    .skill-option-stagger {
      animation: skillOptionStaggerIn 300ms cubic-bezier(0.16, 1, 0.3, 1) both !important;
      will-change: transform, opacity !important;
    }

    .skill-option-card {
      transition: transform 180ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 180ms ease, border-color 180ms ease, background-color 180ms ease !important;
      cursor: pointer !important;
      user-select: none !important;
    }

    .skill-option-card:hover {
      transform: translateY(-3px) scale(1.008) !important;
      box-shadow: 0 8px 22px rgba(124, 58, 237, 0.16) !important;
    }

    .skill-option-card:active {
      transform: scale(0.97) !important;
    }

    .skill-radio-pop-active {
      animation: skillRadioCheckPop 260ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards !important;
    }

    .skill-interactive-btn {
      transition: transform 160ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 160ms ease, background-color 160ms ease, opacity 160ms ease !important;
      cursor: pointer !important;
      user-select: none !important;
    }

    .skill-interactive-btn:hover {
      transform: translateY(-2px) !important;
      box-shadow: 0 6px 16px rgba(124, 58, 237, 0.18) !important;
    }

    .skill-interactive-btn:active {
      transform: scale(0.96) !important;
    }

    .skill-spinner-icon {
      animation: skillSpinnerRotate 800ms linear infinite !important;
      display: inline-block !important;
    }

    .skill-result-entering {
      animation: skillResultBounceIn 500ms cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
      will-change: transform, opacity !important;
    }

    .skill-progress-bar-fill {
      transition: width 350ms cubic-bezier(0.16, 1, 0.3, 1) !important;
    }

    /* ============================================================ */
    /* CLAYMORPHIC INTERACTIVE BUTTONS & CARDS HOVER & PRESS        */
    /* ============================================================ */
    [data-testid="skill-submit-project-repo"],
    [data-hover-debug="true"],
    .clay-interactive-btn,
    .skill-interactive-btn {
      transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 220ms ease, background-color 220ms ease, border-color 220ms ease !important;
      cursor: pointer !important;
      user-select: none !important;
    }

    [data-testid="skill-submit-project-repo"]:hover,
    [data-hover-debug="true"]:hover,
    .clay-interactive-btn:hover,
    .skill-interactive-btn:hover {
      transform: translateY(-4px) scale(1.025) !important;
      box-shadow: 0 14px 30px rgba(124, 58, 237, 0.35) !important;
    }

    [data-testid="skill-submit-project-repo"]:active,
    [data-hover-debug="true"]:active,
    .clay-interactive-btn:active,
    .skill-interactive-btn:active {
      transform: translateY(1px) scale(0.96) !important;
    }

    .clay-interactive-card,
    .clay-card-hover,
    .skill-card-hover {
      transition: transform 250ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 250ms ease, border-color 250ms ease !important;
      cursor: pointer !important;
    }

    .clay-interactive-card:hover,
    .clay-card-hover:hover,
    .skill-card-hover:hover {
      transform: translateY(-4px) scale(1.01) !important;
      box-shadow: 18px 18px 36px rgba(160, 150, 180, 0.24), -10px -10px 24px rgba(255, 255, 255, 0.95), 0 6px 18px rgba(124, 58, 237, 0.12) !important;
    }

    .clay-interactive-card:active,
    .clay-card-hover:active,
    .skill-card-hover:active {
      transform: scale(0.985) !important;
    }

    .clay-subcard-hover {
      transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 200ms ease, border-color 200ms ease !important;
      cursor: pointer !important;
    }

    .clay-subcard-hover:hover {
      transform: translateY(-3px) scale(1.015) !important;
      box-shadow: 0 8px 20px rgba(124, 58, 237, 0.14) !important;
    }

    .clay-subcard-hover:active {
      transform: scale(0.97) !important;
    }

    .clay-tab-pill {
      transition: transform 180ms cubic-bezier(0.16, 1, 0.3, 1), background-color 180ms ease, border-color 180ms ease !important;
      cursor: pointer !important;
    }

    .clay-tab-pill:hover {
      transform: translateY(-2px) scale(1.03) !important;
    }

    .clay-tab-pill:active {
      transform: scale(0.95) !important;
    }

    .skillsetu-mentor-fab {
      transition: transform 250ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 250ms ease !important;
      cursor: pointer !important;
    }

    .skillsetu-mentor-fab:hover {
      transform: translateY(-4px) scale(1.04) !important;
      box-shadow: 0 10px 28px rgba(124, 58, 237, 0.45) !important;
    }

    .skillsetu-mentor-fab:active {
      transform: translateY(1px) scale(0.96) !important;
    }

    /* Custom delicate scrollbar */
    .clay-custom-scroll::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    .clay-custom-scroll::-webkit-scrollbar-track {
      background: rgba(124, 58, 237, 0.04);
      border-radius: 999px;
    }
    .clay-custom-scroll::-webkit-scrollbar-thumb {
      background: rgba(124, 58, 237, 0.2);
      border-radius: 999px;
    }
    .clay-custom-scroll::-webkit-scrollbar-thumb:hover {
      background: rgba(124, 58, 237, 0.4);
    }
  `;
};
