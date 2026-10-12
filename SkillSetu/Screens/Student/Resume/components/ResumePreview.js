import React from 'react';
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CLAY_COLORS, CLAY_FONTS, CLAY_RADII, CLAY_SHADOWS } from './DesignTokens';

export default function ResumePreview({
  resumeData = {},
  editedBuffer = {},
  isEditing = false,
  onUpdateBuffer,
  activeTargetRole = '',
  zoom = 100,
}) {
  const header = resumeData?.header || {};
  const studentName = header.name || 'Candidate';
  const targetRole = activeTargetRole || header.target_role || 'Software Engineer';
  const email = header.email || '';
  const phone = header.phone || '';
  const github = header.github || '';
  const location = header.location || '';
  const photoUrl = header.photo_url || header.profile_image || null;

  const initials = studentName
    ? studentName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'AB';

  const summaryText =
    isEditing || editedBuffer?.summary !== undefined
      ? editedBuffer.summary
      : resumeData?.summary || '';

  const skillsList =
    isEditing || editedBuffer?.skills !== undefined
      ? editedBuffer.skills
      : resumeData?.skills || [];

  const experienceList =
    isEditing || editedBuffer?.experience !== undefined
      ? editedBuffer.experience
      : resumeData?.experience || [];

  const projectsList =
    isEditing || editedBuffer?.projects !== undefined
      ? editedBuffer.projects
      : resumeData?.projects || [];

  const educationList =
    isEditing || editedBuffer?.education !== undefined
      ? editedBuffer.education
      : resumeData?.education || [];

  const certificationsList =
    isEditing || editedBuffer?.certifications !== undefined
      ? editedBuffer.certifications
      : resumeData?.certifications || [];

  return (
    <View style={[styles.outerPreviewWrapper, CLAY_SHADOWS.card]}>
      <ScrollView
        contentContainerStyle={styles.scrollCanvas}
        showsVerticalScrollIndicator={false}
      >
        {/* A4 Resume White Sheet (Dominating Right Column) */}
        <View
          nativeID="resume-paper-sheet"
          style={[
            styles.a4Sheet,
            CLAY_SHADOWS.resumeSheet,
            { transform: [{ scale: zoom / 100 }] },
          ]}
        >
          {/* HEADER ROW */}
          <View style={styles.docHeader}>
            <View style={styles.docHeaderLeft}>
              {photoUrl ? (
                <Image source={{ uri: photoUrl }} style={styles.docAvatar} />
              ) : (
                <View style={styles.docAvatarInitialsBox}>
                  <Text style={styles.docInitialsText}>{initials}</Text>
                </View>
              )}
              <View style={styles.docNameCol}>
                <Text style={styles.docNameText}>{studentName.toUpperCase()}</Text>
                <Text style={styles.docRoleText}>{targetRole}</Text>
              </View>
            </View>

            <View style={styles.docContactCol}>
              {Boolean(email) && <Text style={styles.contactItem}>✉  {email}</Text>}
              {Boolean(phone) && <Text style={styles.contactItem}>📞  {phone}</Text>}
              {Boolean(github) && (
                <Text style={styles.contactItem}>🔗  github.com/{github}</Text>
              )}
              {Boolean(location) && <Text style={styles.contactItem}>📍  {location}</Text>}
            </View>
          </View>

          <View style={styles.docDivider} />

          {/* 1. PROFESSIONAL SUMMARY */}
          {Boolean(summaryText) && (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>PROFESSIONAL SUMMARY</Text>
              {isEditing ? (
                <TextInput
                  style={styles.summaryInput}
                  value={summaryText}
                  onChangeText={(val) =>
                    onUpdateBuffer &&
                    onUpdateBuffer((prev) => ({ ...prev, summary: val }))
                  }
                  multiline
                  placeholder="Enter professional summary..."
                />
              ) : (
                <Text style={styles.bodyText}>{summaryText}</Text>
              )}
            </View>
          )}

          {/* 2. TECHNICAL SKILLS */}
          {skillsList && skillsList.length > 0 && (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>TECHNICAL SKILLS</Text>
              <View style={styles.skillsTable}>
                {skillsList.map((skill, sIdx) => (
                  <View key={sIdx} style={styles.skillRow}>
                    <Text style={styles.skillLabel}>
                      {skill.label || skill.category || 'Skills'}:
                    </Text>
                    <Text style={styles.skillValue}>
                      {skill.value ||
                        (Array.isArray(skill.skills) ? skill.skills.join(', ') : '')}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 3. EXPERIENCE */}
          {experienceList && experienceList.length > 0 && (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>EXPERIENCE</Text>
              {experienceList.map((exp, eIdx) => (
                <View key={eIdx} style={styles.itemBlock}>
                  <View style={styles.itemHeaderLine}>
                    <Text style={styles.itemTitle}>{exp.title}</Text>
                    <Text style={styles.itemMeta}>
                      {exp.company}
                      {exp.period ? ` | ${exp.period}` : ''}
                    </Text>
                  </View>
                  {exp.bullets && exp.bullets.length > 0 ? (
                    <View style={styles.bulletsList}>
                      {exp.bullets.map((bullet, bIdx) => (
                        <View key={bIdx} style={styles.bulletRow}>
                          <Text style={styles.bulletDot}>•</Text>
                          <Text style={styles.bulletText}>{bullet}</Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    Boolean(exp.description) && (
                      <Text style={styles.bodyText}>{exp.description}</Text>
                    )
                  )}
                </View>
              ))}
            </View>
          )}

          {/* 4. KEY PROJECTS */}
          {projectsList && projectsList.length > 0 && (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>KEY PROJECTS</Text>
              {projectsList.map((proj, pIdx) => (
                <View key={pIdx} style={styles.itemBlock}>
                  <View style={styles.itemHeaderLine}>
                    <Text style={styles.itemTitle}>{proj.title}</Text>
                    <Text style={styles.itemMeta}>
                      {proj.type || 'GitHub Repository'}
                    </Text>
                  </View>

                  {proj.bullets && proj.bullets.length > 0 ? (
                    <View style={styles.bulletsList}>
                      {proj.bullets.map((b, bIdx) => (
                        <View key={bIdx} style={styles.bulletRow}>
                          <Text style={styles.bulletDot}>•</Text>
                          <Text style={styles.bulletText}>{b}</Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    Boolean(proj.description) && (
                      <Text style={styles.bodyText}>{proj.description}</Text>
                    )
                  )}

                  {proj.technologies && proj.technologies.length > 0 && (
                    <Text style={styles.techLine}>
                      Technologies:{' '}
                      {Array.isArray(proj.technologies)
                        ? proj.technologies.join(' · ')
                        : proj.technologies}
                    </Text>
                  )}

                  {Boolean(proj.github_url) && (
                    <Text style={styles.githubLink}>🔗 {proj.github_url}</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* 5. EDUCATION */}
          {educationList && educationList.length > 0 && (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>EDUCATION</Text>
              {educationList.map((edu, edIdx) => (
                <View key={edIdx} style={styles.itemBlock}>
                  <View style={styles.itemHeaderLine}>
                    <Text style={styles.itemTitle}>{edu.degree}</Text>
                    <Text style={styles.itemMeta}>
                      {edu.university}
                      {edu.graduationYear ? ` / ${edu.graduationYear}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.courseworkText}>
                    Relevant Coursework: Data Structures, Algorithms, Database Systems, System Design
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* 6. CERTIFICATIONS / ACHIEVEMENTS */}
          {certificationsList && certificationsList.length > 0 && (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>CERTIFICATIONS & ACHIEVEMENTS</Text>
              {certificationsList.map((cert, cIdx) => (
                <View key={cIdx} style={styles.certBlock}>
                  <Text style={styles.certTitle}>
                    {typeof cert === 'string'
                      ? cert
                      : cert.title || cert.name || 'Verified Credential'}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerPreviewWrapper: {
    backgroundColor: '#ECE7F7',
    borderRadius: CLAY_RADII.card,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    padding: 24,
    minHeight: 820,
  },
  scrollCanvas: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 8,
  },
  a4Sheet: {
    backgroundColor: CLAY_COLORS.sheetBg,
    width: '100%',
    maxWidth: 720,
    minHeight: 880,
    borderRadius: 8,
    padding: 34,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    gap: 12,
  },

  // Document Header
  docHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  docHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  docAvatar: {
    width: 52,
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: CLAY_COLORS.subtleBorder,
  },
  docAvatarInitialsBox: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: CLAY_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docInitialsText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 18,
    fontWeight: '900',
    color: CLAY_COLORS.paper,
  },
  docNameCol: {
    gap: 2,
    flex: 1,
  },
  docNameText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 18,
    fontWeight: '900',
    color: CLAY_COLORS.foregroundDark,
    letterSpacing: 0.8,
  },
  docRoleText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12,
    fontWeight: '700',
    color: CLAY_COLORS.primary,
  },
  docContactCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  contactItem: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 9.5,
    color: '#475569',
    fontWeight: '500',
  },
  docDivider: {
    height: 1.5,
    backgroundColor: '#E2E8F0',
    width: '100%',
    marginVertical: 2,
  },

  // Sections
  sectionBlock: {
    gap: 4,
  },
  sectionTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10.5,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
    letterSpacing: 0.6,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 2,
    marginBottom: 2,
  },
  bodyText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 10.5,
    lineHeight: 15,
    color: '#1E293B',
    textAlign: 'justify',
  },
  summaryInput: {
    fontFamily: CLAY_FONTS.body,
    backgroundColor: CLAY_COLORS.recessed,
    borderRadius: 8,
    padding: 8,
    fontSize: 10.5,
    lineHeight: 15,
    color: CLAY_COLORS.foreground,
    minHeight: 70,
    borderWidth: 1,
    borderColor: CLAY_COLORS.inputBorder,
    textAlignVertical: 'top',
  },

  // Skills Table
  skillsTable: {
    gap: 3,
  },
  skillRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  skillLabel: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0F172A',
    width: 90,
  },
  skillValue: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 10.5,
    color: '#334155',
    flex: 1,
  },

  // Item Blocks
  itemBlock: {
    gap: 2,
    marginBottom: 4,
  },
  itemHeaderLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  itemTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  itemMeta: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  bulletsList: {
    gap: 2,
    marginTop: 1,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 5,
    paddingRight: 6,
  },
  bulletDot: {
    fontSize: 10,
    color: '#334155',
  },
  bulletText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 10,
    lineHeight: 14,
    color: '#334155',
    flex: 1,
  },
  techLine: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 9.5,
    color: CLAY_COLORS.primary,
    fontWeight: '600',
    marginTop: 1,
  },
  githubLink: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 9.5,
    color: '#2563EB',
    marginTop: 1,
  },
  courseworkText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 9.5,
    color: '#64748B',
    fontStyle: 'italic',
  },
  certBlock: {
    gap: 1,
  },
  certTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0F172A',
  },
});
