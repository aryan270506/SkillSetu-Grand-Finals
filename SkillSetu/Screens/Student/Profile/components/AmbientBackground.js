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
            top: '-5%',
            left: '6%',
            width: '480px',
            height: '480px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(124, 58, 237, 0.12) 0%, rgba(124, 58, 237, 0.02) 70%, transparent 100%)',
            filter: 'blur(80px)',
            animation: 'profile-float 16s ease-in-out infinite alternate',
          }}
        />

        {/* Pink Ambient Orb 2 */}
        <div
          style={{
            position: 'absolute',
            top: '32%',
            right: '-4%',
            width: '440px',
            height: '440px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(219, 39, 119, 0.10) 0%, rgba(219, 39, 119, 0.02) 70%, transparent 100%)',
            filter: 'blur(85px)',
            animation: 'profile-float-slow 20s ease-in-out infinite alternate',
            animationDelay: '3s',
          }}
        />

        {/* Sky Ambient Orb 3 */}
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            left: '12%',
            width: '460px',
            height: '460px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(14, 165, 233, 0.09) 0%, rgba(14, 165, 233, 0.02) 70%, transparent 100%)',
            filter: 'blur(85px)',
            animation: 'profile-float 22s ease-in-out infinite alternate',
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
    backgroundColor: '#7C3AED',
  },
  blobPink: {
    top: 300,
    right: -20,
    width: 240,
    height: 240,
    backgroundColor: '#DB2777',
  },
});
