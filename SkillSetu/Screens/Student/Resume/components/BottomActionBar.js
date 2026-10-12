import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  CLAY_COLORS,
  CLAY_FONTS,
  CLAY_RADII,
  CLAY_SHADOWS,
  getClayPrimaryBtnStyle,
  getClaySecondaryBtnStyle,
  getClayZoomBtnStyle,
} from './DesignTokens';

export default function BottomActionBar({
  isEditing = false,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDownloadPdf,
  zoom = 100,
  setZoom,
}) {
  return (
    <View style={[styles.floatingBar, CLAY_SHADOWS.floatingBar]}>
      {/* Auto-saved Status */}
      <View style={styles.statusSection}>
        <View style={styles.greenPulseDot} />
        <Text style={styles.statusText}>Auto-saved: Just now</Text>
      </View>

      <View style={styles.divider} />

      {/* Zoom Controls */}
      <View style={styles.zoomControls}>
        <Pressable
          className="clay-zoom-btn"
          style={({ hovered, pressed }) => [
            styles.zoomBtn,
            getClayZoomBtnStyle({ hovered, pressed }),
          ]}
          onPress={() => setZoom && setZoom(Math.max(60, zoom - 10))}
        >
          <Text style={styles.zoomBtnText}>−</Text>
        </Pressable>
        <Pressable
          className="clay-breadcrumb-link"
          onPress={() => setZoom && setZoom(100)}
        >
          <Text style={styles.zoomText}>{zoom}%</Text>
        </Pressable>
        <Pressable
          className="clay-zoom-btn"
          style={({ hovered, pressed }) => [
            styles.zoomBtn,
            getClayZoomBtnStyle({ hovered, pressed }),
          ]}
          onPress={() => setZoom && setZoom(Math.min(130, zoom + 10))}
        >
          <Text style={styles.zoomBtnText}>+</Text>
        </Pressable>
      </View>

      <View style={styles.divider} />

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {!isEditing ? (
          <>
            <Pressable
              className="clay-btn-secondary"
              style={({ hovered, pressed }) => [
                styles.editBtn,
                getClaySecondaryBtnStyle({ hovered, pressed }),
              ]}
              onPress={onStartEdit}
            >
              <Text style={styles.editBtnIcon}>✏️</Text>
              <Text style={styles.editBtnText}>Edit Buffer</Text>
            </Pressable>

            <Pressable
              className="clay-btn-primary"
              style={({ hovered, pressed }) => [
                styles.downloadBtn,
                getClayPrimaryBtnStyle({ hovered, pressed }),
              ]}
              onPress={onDownloadPdf}
            >
              <Text style={styles.downloadIcon}>📥</Text>
              <Text style={styles.downloadText}>Download PDF</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              className="clay-btn-secondary"
              style={({ hovered, pressed }) => [
                styles.cancelBtn,
                getClaySecondaryBtnStyle({ hovered, pressed }),
              ]}
              onPress={onCancelEdit}
            >
              <Text style={styles.cancelText}>Discard</Text>
            </Pressable>

            <Pressable
              className="clay-btn-primary"
              style={({ hovered, pressed }) => [
                styles.saveBtn,
                getClayPrimaryBtnStyle({ hovered, pressed }),
              ]}
              onPress={onSaveEdit}
            >
              <Text style={styles.saveText}>Save Changes</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingBar: {
    backgroundColor: '#1E1B26',
    borderRadius: CLAY_RADII.pill,
    paddingVertical: 10,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    alignSelf: 'center',
    marginTop: 24,
    marginBottom: 16,
    zIndex: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  greenPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  statusText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11.5,
    color: '#E2E0E8',
    fontWeight: '500',
  },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  zoomBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 15,
  },
  zoomText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    minWidth: 32,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: CLAY_RADII.pill,
  },
  editBtnIcon: {
    fontSize: 11,
  },
  editBtnText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0b0a0aff',
  },
  downloadBtn: {
    backgroundColor: CLAY_COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: CLAY_RADII.pill,
  },
  downloadIcon: {
    fontSize: 11,
  },
  downloadText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cancelBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: CLAY_RADII.pill,
  },
  cancelText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FCA5A5',
  },
  saveBtn: {
    backgroundColor: CLAY_COLORS.success,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: CLAY_RADII.pill,
  },
  saveText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
