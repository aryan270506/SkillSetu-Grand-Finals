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
        {/* Violet Ambient Orb 1 */}
        <div
          style={{
            position: 'absolute',
            top: '-6%',
            left: '8%',
            width: '480px',
            height: '480px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, rgba(124, 58, 237, 0.02) 70%, transparent 100%)',
            filter: 'blur(75px)',
            animation: 'clay-float 16s ease-in-out infinite alternate',
          }}
        />

        {/* Pink Secondary Ambient Orb 2 */}
        <div
          style={{
            position: 'absolute',
            top: '30%',
            right: '-5%',
            width: '440px',
            height: '440px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(236, 72, 153, 0.10) 0%, rgba(219, 39, 119, 0.02) 70%, transparent 100%)',
            filter: 'blur(80px)',
            animation: 'clay-float-delayed 20s ease-in-out infinite alternate',
            animationDelay: '3s',
          }}
        />

        {/* Sky Blue Sub-Ambient Orb 3 */}
        <div
          style={{
            position: 'absolute',
            bottom: '12%',
            left: '15%',
            width: '460px',
            height: '460px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(14, 165, 233, 0.09) 0%, rgba(2, 132, 199, 0.02) 70%, transparent 100%)',
            filter: 'blur(85px)',
            animation: 'clay-float-slow 24s ease-in-out infinite alternate',
            animationDelay: '6s',
          }}
        />
      </div>
    );
  }

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
    opacity: 0.1,
  },
  blobViolet: {
    top: -40,
    left: 40,
    width: 280,
    height: 280,
    backgroundColor: '#8B5CF6',
  },
  blobPink: {
    top: 300,
    right: -20,
    width: 240,
    height: 240,
    backgroundColor: '#EC4899',
  },
});
