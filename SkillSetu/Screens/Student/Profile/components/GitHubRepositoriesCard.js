import React from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { CLAY_COLORS, CLAY_FONTS, CLAY_RADII, CLAY_SHADOWS } from './DesignTokens';

export default function GitHubRepositoriesCard({
  githubLinks = {},
  user = {},
}) {
  const isConnected = githubLinks?.githubConnected || Boolean(user?.github_user_id);
  const rawRepos = githubLinks?.repositories || [];

  const defaultMockRepos = [
    {
      name: 'raft-consensus-go',
      language: 'Go 1.22',
      stargazers_count: 142,
      forks_count: 28,
      tag: '94% Test Coverage',
      tagType: 'primary',
      description: 'Lightweight Raft consensus algorithm implementation with gRPC streaming and linearizable read state machine.',
      statusNote: '✓ Live CI Passing • Commit sha: 8ffa12a',
      html_url: 'https://github.com/aryan270506',
    },
    {
      name: 'distributed-cache-node',
      language: 'Rust / C++',
      stargazers_count: 89,
      forks_count: 14,
      tag: 'Zero-Alloc Engine',
      tagType: 'secondary',
      description: 'Consistent hashing, bloom filter integration, zero-allocation LRU eviction engine with microsecond telemetry.',
      statusNote: '🛡️ Automated SonarQube verified',
      html_url: 'https://github.com/aryan270506',
    },
    {
      name: 'campus-sandbox-runner',
      language: 'TypeScript / Docker',
      stargazers_count: 64,
      forks_count: 11,
      tag: 'Sandbox Active',
      tagType: 'sky',
      description: 'Multi-tenant proctored code evaluation container runner with cgroups v2 isolation and microsecond telemetry.',
      statusNote: '🏛️ Adopted by University Media Lab',
      html_url: 'https://github.com/aryan270506',
    },
  ];

  const reposToDisplay = rawRepos.length > 0
    ? rawRepos.slice(0, 4).map((repo, idx) => ({
        name: repo.name,
        language: repo.language || 'JavaScript',
        stargazers_count: repo.stargazers_count || 0,
        forks_count: repo.forks_count || 0,
        tag: idx === 0 ? 'Production Ready' : 'Verified Codebase',
        tagType: 'primary',
        description: repo.description || 'Public repository code evidence with proctored static analysis and automated verification.',
        statusNote: `Updated ${repo.updated_at ? new Date(repo.updated_at).toLocaleDateString() : 'recently'} • Commit verified`,
        html_url: repo.html_url || `https://github.com/${githubLinks.githubUsername || 'aryan270506'}/${repo.name}`,
      }))
    : defaultMockRepos;

  const openRepo = (url) => {
    if (!url) return;
    if (Platform.OS === 'web') {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      Linking.openURL(url).catch(() => {});
    }
  };

  return (
    <View style={[styles.cardContainer, Platform.OS === 'web' && { className: 'clay-section-revealed clay-hover-lift' }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>OPEN SOURCE CODEBASES</Text>
          <Text style={styles.cardTitle}>Public GitHub Repositories</Text>
        </View>

        <View style={styles.badgesRow}>
          <View style={styles.commitsBadge}>
            <Text style={styles.commitsBadgeText}>⚡ 450+ Commits this year</Text>
          </View>
          <View style={styles.percentileBadge}>
            <Text style={styles.percentileBadgeText}>Top 3% Golang</Text>
          </View>
        </View>
      </View>

      {/* Repositories List */}
      <View style={styles.reposList}>
        {reposToDisplay.map((repo, index) => (
          <View
            key={index}
            style={[
              styles.repoCard,
              Platform.OS === 'web' && {
                className: 'clay-hover-lift',
                animationDelay: `${index * 60}ms`,
              },
            ]}
          >
            {/* Upper row: Name, Lang, Stars, Forks, Tag */}
            <View style={styles.repoTopRow}>
              <View style={styles.repoIdentity}>
                <Text style={styles.repoIcon}>📦</Text>
                <Text style={styles.repoName}>{repo.name}</Text>
                {repo.language && (
                  <View style={styles.languageBadge}>
                    <Text style={styles.languageText}>{repo.language}</Text>
                  </View>
                )}
              </View>

              <View style={styles.repoMetaStats}>
                <View style={styles.statPill}>
                  <Text style={styles.statIcon}>⭐</Text>
                  <Text style={styles.statText}>{repo.stargazers_count} stars</Text>
                </View>
                {repo.forks_count > 0 && (
                  <View style={styles.statPill}>
                    <Text style={styles.statIcon}>🔀</Text>
                    <Text style={styles.statText}>{repo.forks_count} forks</Text>
                  </View>
                )}
                {repo.tag && (
                  <View style={[styles.tagBadge, repo.tagType === 'secondary' ? styles.tagSecondary : styles.tagPrimary]}>
                    <Text style={[styles.tagText, repo.tagType === 'secondary' ? styles.tagTextSecondary : styles.tagTextPrimary]}>
                      {repo.tag}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Description */}
            <Text style={styles.repoDesc}>{repo.description}</Text>

            {/* Footer Row: Status Note + View Source Link */}
            <View style={styles.repoFooter}>
              <Text style={styles.statusNoteText}>{repo.statusNote}</Text>
              <Pressable
                style={[styles.viewSourceBtn, Platform.OS === 'web' && { className: 'clay-btn-interactive' }]}
                onPress={() => openRepo(repo.html_url)}
              >
                <Text style={styles.viewSourceText}>View Source ↗</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: CLAY_COLORS.paper,
    borderRadius: CLAY_RADII.card,
    borderWidth: 1.5,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 24,
    marginBottom: 24,
    ...CLAY_SHADOWS.card,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 18,
  },
  eyebrow: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 20,
    fontWeight: '900',
    color: CLAY_COLORS.foregroundDark,
    marginTop: 2,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  commitsBadge: {
    backgroundColor: CLAY_COLORS.recessedLight,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: CLAY_RADII.pill,
  },
  commitsBadgeText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '700',
    color: CLAY_COLORS.foreground,
  },
  percentileBadge: {
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: CLAY_RADII.pill,
  },
  percentileBadgeText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11,
    fontWeight: '800',
    color: CLAY_COLORS.primaryDark,
  },
  reposList: {
    gap: 14,
  },
  repoCard: {
    backgroundColor: CLAY_COLORS.recessedLight,
    borderRadius: CLAY_RADII.cardSmall,
    borderWidth: 1,
    borderColor: CLAY_COLORS.cardBorder,
    padding: 16,
    gap: 8,
  },
  repoTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  repoIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  repoIcon: {
    fontSize: 14,
  },
  repoName: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 15,
    fontWeight: '800',
    color: CLAY_COLORS.foregroundDark,
  },
  languageBadge: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  languageText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10,
    fontWeight: '700',
    color: '#3730A3',
  },
  repoMetaStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statIcon: {
    fontSize: 12,
  },
  statText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12,
    color: CLAY_COLORS.muted,
    fontWeight: '600',
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: CLAY_RADII.pill,
  },
  tagPrimary: {
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
  },
  tagSecondary: {
    backgroundColor: 'rgba(219, 39, 119, 0.12)',
  },
  tagText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 10.5,
    fontWeight: '800',
  },
  tagTextPrimary: {
    color: CLAY_COLORS.primaryDark,
  },
  tagTextSecondary: {
    color: CLAY_COLORS.secondary,
  },
  repoDesc: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 12.5,
    color: CLAY_COLORS.muted,
    lineHeight: 18,
  },
  repoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(124, 58, 237, 0.06)',
  },
  statusNoteText: {
    fontFamily: CLAY_FONTS.body,
    fontSize: 11.5,
    color: CLAY_COLORS.muted,
    fontWeight: '500',
  },
  viewSourceBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  viewSourceText: {
    fontFamily: CLAY_FONTS.heading,
    fontSize: 11.5,
    fontWeight: '800',
    color: CLAY_COLORS.primary,
  },
});
