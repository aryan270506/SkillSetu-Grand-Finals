import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

export const CLAY_COLORS = {
  canvas: '#F4F1FA',
  foreground: '#332F3A',
  muted: '#635F69',
  cardBg: '#FFFFFF',
  cardSubtle: '#F9F7FC',
  borderLight: 'rgba(124, 58, 237, 0.08)',
  borderMedium: 'rgba(124, 58, 237, 0.16)',
  borderStrong: 'rgba(124, 58, 237, 0.28)',

  primary: '#7C3AED',
  primaryLight: '#8B5CF6',
  primaryBg: 'rgba(124, 58, 237, 0.08)',
  primaryHover: '#6D28D9',

  secondary: '#DB2777',
  secondaryLight: '#EC4899',
  secondaryBg: 'rgba(219, 39, 119, 0.08)',

  sky: '#0EA5E9',
  skyBg: 'rgba(14, 165, 233, 0.08)',
  skyText: '#0284C7',

  emerald: '#10B981',
  emeraldBg: 'rgba(16, 185, 129, 0.08)',
  emeraldText: '#059669',

  amber: '#F59E0B',
  amberBg: 'rgba(245, 158, 11, 0.08)',
  amberText: '#D97706',

  crimson: '#EF4444',
  crimsonBg: 'rgba(239, 68, 68, 0.08)',
  crimsonText: '#DC2626',

  indigo: '#4F46E5',
  indigoBg: 'rgba(79, 70, 229, 0.08)',
  indigoText: '#4338CA',

  glassBorder: 'rgba(255, 255, 255, 0.8)',
  clayShadow: 'rgba(76, 29, 149, 0.06)',
};

export const CLAY_RADII = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  full: 9999,
};

export const CLAY_SHADOWS = {
  card: {
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  cardHover: {
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
    elevation: 10,
  },
  modal: {
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.24,
    shadowRadius: 40,
    elevation: 18,
  },
};

export const CLAY_FONTS = {
  family: Platform.select({
    web: "'Nunito', 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    default: 'System',
  }),
};

/**
 * Injects Google Fonts and high-performance CSS animation transitions.
 */
export function ensureScholarshipGlobalStyles() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const styleId = 'skillsetu-scholarship-clay-styles';
  if (document.getElementById(styleId)) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Nunito:wght@400;600;700;800;900&display=swap';
  document.head.appendChild(link);

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    * {
      box-sizing: border-box;
    }
    .clay-card-lift {
      transition: transform 0.26s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.26s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.26s ease;
      will-change: transform, box-shadow;
    }
    .clay-card-lift:hover {
      transform: translateY(-6px) scale(1.012) !important;
      box-shadow: 0 16px 36px rgba(76, 29, 149, 0.13) !important;
      border-color: rgba(124, 58, 237, 0.25) !important;
    }
    .clay-card-lift:active {
      transform: translateY(-2px) scale(0.99) !important;
      transition-duration: 0.1s;
    }
    .clay-btn-interactive {
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), filter 0.2s ease, box-shadow 0.2s ease;
      cursor: pointer;
    }
    .clay-btn-interactive:hover {
      transform: translateY(-2px) scale(1.025);
      filter: brightness(1.05);
      box-shadow: 0 6px 16px rgba(124, 58, 237, 0.22);
    }
    .clay-btn-interactive:active {
      transform: translateY(0px) scale(0.96);
      filter: brightness(0.96);
      transition-duration: 0.08s;
    }
    .clay-save-btn {
      transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s ease;
      cursor: pointer;
    }
    .clay-save-btn:hover {
      transform: scale(1.14);
    }
    .clay-save-btn:active {
      transform: scale(0.90);
    }
    @keyframes popInModal {
      from {
        opacity: 0;
        transform: translateY(28px) scale(0.91);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    .animate-modal-pop {
      animation: popInModal 0.32s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes shimmerWave {
      0% { background-position: -300px 0; }
      100% { background-position: 300px 0; }
    }
    .skeleton-shimmer {
      background: linear-gradient(90deg, rgba(124, 58, 237, 0.04) 25%, rgba(124, 58, 237, 0.12) 50%, rgba(124, 58, 237, 0.04) 75%);
      background-size: 600px 100%;
      animation: shimmerWave 1.8s infinite linear;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Reusable Claymorphism Card Container
 */
export function ClayCard({ children, style, subtle = false, ...props }) {
  return (
    <View
      style={[
        styles.cardBase,
        subtle ? styles.cardSubtle : styles.cardDefault,
        CLAY_SHADOWS.card,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

/**
 * Reusable Claymorphism Badge
 */
export function ClayBadge({ text, icon, variant = 'primary', size = 'md', style, textStyle }) {
  const badgeConfig = {
    primary: { bg: CLAY_COLORS.primaryBg, text: CLAY_COLORS.primary, border: 'rgba(124, 58, 237, 0.2)' },
    secondary: { bg: CLAY_COLORS.secondaryBg, text: CLAY_COLORS.secondary, border: 'rgba(219, 39, 119, 0.2)' },
    emerald: { bg: CLAY_COLORS.emeraldBg, text: CLAY_COLORS.emeraldText, border: 'rgba(16, 185, 129, 0.25)' },
    amber: { bg: CLAY_COLORS.amberBg, text: CLAY_COLORS.amberText, border: 'rgba(245, 158, 11, 0.25)' },
    sky: { bg: CLAY_COLORS.skyBg, text: CLAY_COLORS.skyText, border: 'rgba(14, 165, 233, 0.25)' },
    crimson: { bg: CLAY_COLORS.crimsonBg, text: CLAY_COLORS.crimsonText, border: 'rgba(239, 68, 68, 0.25)' },
    indigo: { bg: CLAY_COLORS.indigoBg, text: CLAY_COLORS.indigoText, border: 'rgba(79, 70, 229, 0.25)' },
    muted: { bg: 'rgba(99, 95, 105, 0.08)', text: CLAY_COLORS.muted, border: 'rgba(99, 95, 105, 0.2)' },
  };

  const cfg = badgeConfig[variant] || badgeConfig.primary;
  const isSm = size === 'sm';

  return (
    <View
      style={[
        styles.badgeBase,
        {
          backgroundColor: cfg.bg,
          borderColor: cfg.border,
          paddingHorizontal: isSm ? 8 : 12,
          paddingVertical: isSm ? 3 : 5,
        },
        style,
      ]}
    >
      {icon ? <Text style={[styles.badgeIcon, { color: cfg.text, fontSize: isSm ? 10 : 12 }]}>{icon} </Text> : null}
      <Text style={[styles.badgeText, { color: cfg.text, fontSize: isSm ? 11 : 12.5 }, textStyle]}>
        {text}
      </Text>
    </View>
  );
}

/**
 * Reusable Claymorphism Button
 */
export function ClayButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  style,
  textStyle,
}) {
  const buttonConfig = {
    primary: {
      bg: CLAY_COLORS.primary,
      text: '#FFFFFF',
      border: 'transparent',
    },
    secondary: {
      bg: CLAY_COLORS.secondary,
      text: '#FFFFFF',
      border: 'transparent',
    },
    emerald: {
      bg: CLAY_COLORS.emerald,
      text: '#FFFFFF',
      border: 'transparent',
    },
    outline: {
      bg: '#FFFFFF',
      text: CLAY_COLORS.primary,
      border: CLAY_COLORS.borderMedium,
    },
    subtle: {
      bg: CLAY_COLORS.primaryBg,
      text: CLAY_COLORS.primary,
      border: 'transparent',
    },
    ghost: {
      bg: 'transparent',
      text: CLAY_COLORS.foreground,
      border: 'transparent',
    },
  };

  const cfg = buttonConfig[variant] || buttonConfig.primary;
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ hovered, pressed }) => [
        styles.buttonBase,
        {
          backgroundColor: cfg.bg,
          borderColor: cfg.border,
          paddingHorizontal: isSm ? 12 : isLg ? 24 : 18,
          paddingVertical: isSm ? 7 : isLg ? 14 : 10,
          opacity: disabled ? 0.6 : 1,
          transform: [
            { translateY: hovered && !disabled ? -2 : 0 },
            { scale: pressed && !disabled ? 0.96 : hovered && !disabled ? 1.025 : 1 },
          ],
        },
        style,
      ]}
    >
      {icon ? <Text style={[styles.buttonIcon, { color: cfg.text, marginRight: 6 }]}>{icon}</Text> : null}
      <Text
        style={[
          styles.buttonText,
          {
            color: cfg.text,
            fontSize: isSm ? 12 : isLg ? 15 : 13.5,
          },
          textStyle,
        ]}
      >
        {loading ? 'Processing...' : title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardBase: {
    borderRadius: CLAY_RADII.lg,
    borderWidth: 1,
    padding: 20,
  },
  cardDefault: {
    backgroundColor: CLAY_COLORS.cardBg,
    borderColor: CLAY_COLORS.borderLight,
  },
  cardSubtle: {
    backgroundColor: CLAY_COLORS.cardSubtle,
    borderColor: CLAY_COLORS.borderLight,
  },
  badgeBase: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: CLAY_RADII.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeIcon: {
    marginRight: 2,
    fontWeight: '700',
  },
  badgeText: {
    fontFamily: CLAY_FONTS.family,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  buttonBase: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: CLAY_RADII.md,
    borderWidth: 1,
  },
  buttonIcon: {
    fontWeight: '700',
  },
  buttonText: {
    fontFamily: CLAY_FONTS.family,
    fontWeight: '700',
    textAlign: 'center',
  },
});
