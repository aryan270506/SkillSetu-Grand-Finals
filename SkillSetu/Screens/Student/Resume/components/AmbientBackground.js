import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

export default function AmbientBackground() {
  if (Platform.OS === 'web') {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          zIndex: 0,
          overflow: 'hidden',
        }}
        aria-hidden="true"
      >
        {/* Violet Ambient Orb 1 (16s clay-float) */}
        <div
          style={{
            position: 'absolute',
            top: '-5%',
            left: '10%',
            width: '460px',
            height: '460px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, rgba(124, 58, 237, 0.02) 70%, transparent 100%)',
            filter: 'blur(75px)',
            animation: 'clay-float 16s ease-in-out infinite alternate',
          }}
        />

        {/* Pink Secondary Ambient Orb 2 (20s clay-float-delayed, 4s delay) */}
        <div
          style={{
            position: 'absolute',
            top: '25%',
            right: '-4%',
            width: '420px',
            height: '420px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(236, 72, 153, 0.10) 0%, rgba(219, 39, 119, 0.02) 70%, transparent 100%)',
            filter: 'blur(80px)',
            animation: 'clay-float-delayed 20s ease-in-out infinite alternate',
            animationDelay: '4s',
          }}
        />

        {/* Sky Blue Sub-Ambient Orb 3 (24s clay-float-slow, 8s delay) */}
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            left: '20%',
            width: '440px',
            height: '440px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(14, 165, 233, 0.10) 0%, rgba(2, 132, 199, 0.02) 70%, transparent 100%)',
            filter: 'blur(85px)',
            animation: 'clay-float-slow 24s ease-in-out infinite alternate',
            animationDelay: '8s',
          }}
        />
      </div>
    );
  }

  // Fallback for native
  return (
    <View style={styles.nativeContainer} pointerEvents="none">
      <View style={[styles.nativeBlob, styles.blobViolet]} />
      <View style={[styles.nativeBlob, styles.blobPink]} />
    </View>
  );
}

const styles = StyleSheet.create({
  nativeContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  nativeBlob: {
    position: 'absolute',
    borderRadius: 200,
    opacity: 0.12,
  },
  blobViolet: {
    top: -40,
    left: 40,
    width: 280,
    height: 280,
    backgroundColor: '#8B5CF6',
  },
  blobPink: {
    top: 240,
    right: -40,
    width: 260,
    height: 260,
    backgroundColor: '#EC4899',
  },
});
