import React, { useState, useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

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
  emerald: '#10B981',
  emeraldLight: '#D1FAE5',
  emeraldDark: '#047857',
  amber: '#F59E0B',
  amberLight: '#FEF3C7',
  amberDark: '#B45309',
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
};

export const CLAY_RADII = {
  large: 32,
  hero: 26,
  card: 20,
  cardMedium: 16,
  cardSmall: 12,
  button: 12,
  input: 10,
  pill: 9999,
  full: 9999,
};

export const CLAY_SHADOWS = {
  card: Platform.select({
    web: {
      boxShadow: '14px 14px 28px rgba(160, 150, 180, 0.16), -8px -8px 20px rgba(255, 255, 255, 0.9), inset 2px 2px 4px rgba(139, 92, 246, 0.02), inset -2px -2px 4px rgba(255, 255, 255, 1)',
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
      boxShadow: '20px 20px 40px rgba(160, 150, 180, 0.24), -12px -12px 28px rgba(255, 255, 255, 0.95), 0 8px 24px rgba(124, 58, 237, 0.12)',
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
      boxShadow: 'inset 3px 3px 8px #d9d4e3, inset -3px -3px 8px #ffffff',
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
      boxShadow: '0 6px 18px rgba(124, 58, 237, 0.28), inset 1px 1px 2px rgba(255, 255, 255, 0.4), inset -1px -1px 2px rgba(0, 0, 0, 0.1)',
    },
    default: {
      shadowColor: '#7C3AED',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
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

/**
 * Animated Number Counter Hook
 */
export function useAnimatedNumber(targetValue, duration = 800) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const num = typeof targetValue === 'number' ? targetValue : parseInt(targetValue, 10);
    if (isNaN(num)) {
      setDisplayValue(targetValue);
      return;
    }

    if (Platform.OS !== 'web') {
      setDisplayValue(num);
      return;
    }

    const startTime = performance.now();
    let frameId;

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * num);

      setDisplayValue(current);

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      } else {
        setDisplayValue(num);
      }
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [targetValue, duration]);

  return displayValue;
}

/**
 * Animated Progress Bar Component
 */
export function ClayProgressBar({
  progress = 0,
  max = 100,
  color = CLAY_COLORS.primary,
  height = 8,
  borderRadius = 4,
  style,
  trackBg = '#EFEBF5',
  showGlow = false,
}) {
  const [animatedWidth, setAnimatedWidth] = useState(0);
  const percentage = Math.min(100, Math.max(0, (progress / max) * 100));

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedWidth(percentage);
    }, 40);
    return () => clearTimeout(timer);
  }, [percentage]);

  return (
    <View
      style={[
        {
          height,
          backgroundColor: trackBg,
          borderRadius,
          overflow: 'hidden',
          width: '100%',
        },
        style,
      ]}
    >
      <View
        style={[
          {
            height: '100%',
            backgroundColor: color,
            borderRadius,
            width: `${animatedWidth}%`,
          },
          Platform.OS === 'web' && {
            transition: 'width 800ms cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: showGlow ? `0 0 10px ${color}` : undefined,
          },
        ]}
      />
    </View>
  );
}

/**
 * Claymorphic Interactive Button
 */
export function ClayButton({
  style,
  onPress,
  disabled,
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'ghost' | 'outline'
  hoverTranslate = -2,
  hoverScale = 1.025,
  pressScale = 0.96,
  testID,
  dataSet,
  ...props
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: '#FFFFFF',
          borderWidth: 1,
          borderColor: CLAY_COLORS.cardBorder,
          ...CLAY_SHADOWS.buttonSecondary,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: CLAY_COLORS.primary,
        };
      case 'emerald':
        return {
          backgroundColor: CLAY_COLORS.emerald,
          ...CLAY_SHADOWS.buttonPrimary,
        };
      case 'primary':
      default:
        return {
          backgroundColor: CLAY_COLORS.primary,
          ...CLAY_SHADOWS.buttonPrimary,
        };
    }
  };

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
          getVariantStyles(),
          {
            borderRadius: CLAY_RADII.button,
            paddingVertical: 10,
            paddingHorizontal: 16,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 6,
          },
          style,
          Platform.OS === 'web' && {
            cursor: disabled ? 'not-allowed' : 'pointer',
            userSelect: 'none',
            transform: [
              { translateY: activePress ? 1 : activeHover ? hoverTranslate : 0 },
              { scale: activePress ? pressScale : activeHover ? hoverScale : 1 },
            ],
            transitionDuration: '200ms',
            transitionProperty: 'transform, box-shadow, background-color, border-color, opacity',
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: activeHover
              ? (variant === 'primary' || variant === 'emerald'
                  ? '0 10px 24px rgba(124, 58, 237, 0.32)'
                  : '0 8px 20px rgba(160, 150, 180, 0.22)')
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
 * Claymorphic Interactive Card
 */
export function ClayCard({
  style,
  children,
  onPress,
  hoverTranslate = -4,
  hoverScale = 1.015,
  pressScale = 0.985,
  interactive = true,
  className = '',
  testID,
  dataSet,
  ...props
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const baseStyle = [
    {
      backgroundColor: CLAY_COLORS.paper,
      borderRadius: CLAY_RADII.card,
      borderWidth: 1,
      borderColor: CLAY_COLORS.cardBorder,
      padding: 20,
      ...CLAY_SHADOWS.card,
    },
    style,
  ];

  if (!interactive && !onPress) {
    return <View testID={testID} dataSet={dataSet} style={baseStyle} {...props}>{children}</View>;
  }

  return (
    <Pressable
      testID={testID}
      dataSet={dataSet}
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
          baseStyle,
          Platform.OS === 'web' && {
            cursor: onPress ? 'pointer' : 'default',
            transform: [
              { translateY: activePress && onPress ? 1 : activeHover ? hoverTranslate : 0 },
              { scale: activePress && onPress ? pressScale : activeHover ? hoverScale : 1 },
            ],
            transitionDuration: '240ms',
            transitionProperty: 'transform, box-shadow, border-color',
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: activeHover
              ? '20px 20px 40px rgba(160, 150, 180, 0.24), -12px -12px 28px rgba(255, 255, 255, 0.95), 0 8px 24px rgba(124, 58, 237, 0.12)'
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
 * Claymorphic Badge
 */
export function ClayBadge({ label, icon, variant = 'primary', size = 'medium', style, textStyle }) {
  const getColors = () => {
    switch (variant) {
      case 'emerald':
      case 'success':
        return { bg: CLAY_COLORS.emeraldLight, text: CLAY_COLORS.emeraldDark, border: 'rgba(16, 185, 129, 0.25)' };
      case 'secondary':
      case 'pink':
        return { bg: CLAY_COLORS.secondaryLight, text: CLAY_COLORS.secondary, border: 'rgba(219, 39, 119, 0.25)' };
      case 'sky':
      case 'info':
        return { bg: CLAY_COLORS.skyLight, text: CLAY_COLORS.skyDark, border: 'rgba(14, 165, 233, 0.25)' };
      case 'amber':
      case 'warning':
        return { bg: CLAY_COLORS.amberLight, text: CLAY_COLORS.amberDark, border: 'rgba(245, 158, 11, 0.25)' };
      case 'danger':
      case 'rose':
        return { bg: CLAY_COLORS.dangerLight, text: CLAY_COLORS.danger, border: 'rgba(239, 68, 68, 0.25)' };
      case 'muted':
        return { bg: '#F1F5F9', text: CLAY_COLORS.muted, border: 'rgba(100, 116, 139, 0.15)' };
      case 'primary':
      default:
        return { bg: CLAY_COLORS.primaryLight, text: CLAY_COLORS.primary, border: 'rgba(124, 58, 237, 0.25)' };
    }
  };

  const c = getColors();
  const isSmall = size === 'small';

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: c.bg,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: CLAY_RADII.pill,
          paddingHorizontal: isSmall ? 8 : 12,
          paddingVertical: isSmall ? 3 : 5,
          gap: 5,
        },
        style,
      ]}
    >
      {icon ? <Text style={{ fontSize: isSmall ? 10 : 12 }}>{icon}</Text> : null}
      <Text
        style={[
          {
            fontFamily: CLAY_FONTS.heading,
            fontSize: isSmall ? 10.5 : 12,
            fontWeight: '800',
            color: c.text,
            letterSpacing: 0.3,
          },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

/**
 * Section Header
 */
export function SectionHeader({ preTitle, title, subtitle, rightElement, style }) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 12,
        },
        style,
      ]}
    >
      <View style={{ flex: 1, minWidth: 260 }}>
        {preTitle ? (
          <Text
            style={{
              fontFamily: CLAY_FONTS.heading,
              fontSize: 11,
              fontWeight: '800',
              color: CLAY_COLORS.primary,
              letterSpacing: 1,
              textTransform: 'uppercase',
              marginBottom: 3,
            }}
          >
            {preTitle}
          </Text>
        ) : null}
        <Text
          style={{
            fontFamily: CLAY_FONTS.heading,
            fontSize: 20,
            fontWeight: '800',
            color: CLAY_COLORS.foreground,
            letterSpacing: -0.3,
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={{
              fontFamily: CLAY_FONTS.body,
              fontSize: 13,
              color: CLAY_COLORS.muted,
              marginTop: 3,
              lineHeight: 18,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {rightElement ? <View style={{ alignSelf: 'center' }}>{rightElement}</View> : null}
    </View>
  );
}

/**
 * Inject Global CSS & Google Fonts for Dashboard
 */
export const ensureDashboardGlobalStyles = () => {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;

  const styleId = 'skillsetu-dashboard-claymorphism-styles';
  let styleEl = document.getElementById(styleId);

  if (!styleEl) {
    const fontLinkId = 'skillsetu-dashboard-google-fonts';
    if (!document.getElementById(fontLinkId)) {
      const link = document.createElement('link');
      link.id = fontLinkId;
      link.rel = 'stylesheet';
      link.href =
        'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Nunito:ital,wght@0,200..1000;1,200..1000&display=swap';
      document.head.appendChild(link);
    }

    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  styleEl.innerHTML = `
    @keyframes clay-stagger-fade-in {
      0% {
        opacity: 0;
        transform: translateY(16px);
      }
      100% {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .dashboard-section-reveal {
      animation: clay-stagger-fade-in 450ms cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    .dashboard-interactive-card {
      transition: transform 240ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 240ms ease, border-color 240ms ease !important;
      cursor: pointer !important;
    }

    .dashboard-interactive-card:hover {
      transform: translateY(-4px) scale(1.015) !important;
      box-shadow: 20px 20px 40px rgba(160, 150, 180, 0.24), -12px -12px 28px rgba(255, 255, 255, 0.95), 0 8px 24px rgba(124, 58, 237, 0.12) !important;
    }

    .dashboard-interactive-card:active {
      transform: scale(0.985) !important;
    }

    .dashboard-interactive-btn {
      transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 200ms ease, background-color 200ms ease, border-color 200ms ease !important;
      cursor: pointer !important;
      user-select: none !important;
    }

    .dashboard-interactive-btn:hover {
      transform: translateY(-2px) scale(1.025) !important;
      box-shadow: 0 10px 24px rgba(124, 58, 237, 0.32) !important;
    }

    .dashboard-interactive-btn:active {
      transform: translateY(1px) scale(0.96) !important;
    }
  `;
};
