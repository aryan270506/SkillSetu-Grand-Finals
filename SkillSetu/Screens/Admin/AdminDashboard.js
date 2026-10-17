import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  AppFrame,
  Avatar,
  Button,
  Card,
  EmptyState,
  Field,
  IconButton,
  Inset,
  KeyValue,
  Page,
  Pill,
  Row,
  SectionTitle,
  Skeleton,
  Stack,
  StatTile,
  Txt,
} from '../../ui/components';
import { colors, space } from '../../ui/theme';
import { API_BASE } from '../../ui/config';

import { tl } from '../../i18n/tl';
import { formatDateTime } from '../../i18n/format';

export default function AdminDashboard({ user, onLogout }) {
  const [stats, setStats] = useState(null);
  const [pendingRecruiters, setPendingRecruiters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectionReason, setRejectionReason] = useState({});
  const [activeRejectId, setActiveRejectId] = useState(null);
  const [notice, setNotice] = useState(null); // { tone, text }

  const token = user?.token;

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const flash = (tone, text) => {
    setNotice({ tone, text });
    setTimeout(() => setNotice(null), 4000);
  };

  async function fetchDashboardData() {
    setLoading(true);
    try {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      const statsRes = await fetch(`${API_BASE}/admin/dashboard/stats`, { headers });
      const statsData = await statsRes.json();
      if (statsRes.ok && statsData.status === 'success') {
        setStats(statsData.stats);
      }

      const pendingRes = await fetch(`${API_BASE}/admin/recruiters/pending`, { headers });
      const pendingData = await pendingRes.json();
      if (pendingRes.ok && pendingData.status === 'success') {
        setPendingRecruiters(pendingData.recruiters || []);
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
      flash('danger', 'Could not load admin data. Check the backend connection.');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(recruiterId, recruiterName) {
    setActionLoading(recruiterId);
    try {
      const res = await fetch(`${API_BASE}/admin/recruiters/${recruiterId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        flash('success', tl('{{recruiterName}} has been approved.', {
          recruiterName: recruiterName
        }));
        fetchDashboardData();
      } else {
        flash('danger', data.detail || 'Could not approve recruiter.');
      }
    } catch (err) {
      flash('danger', 'Network error while approving recruiter.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(recruiterId, recruiterName) {
    setActionLoading(recruiterId);
    try {
      const res = await fetch(`${API_BASE}/admin/recruiters/${recruiterId}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reason: rejectionReason[recruiterId] || 'Registration documents rejected.',
        }),
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        flash('warning', tl('{{recruiterName}}\'s registration was rejected.', {
          recruiterName: recruiterName
        }));
        setActiveRejectId(null);
        fetchDashboardData();
      } else {
        flash('danger', data.detail || 'Could not reject recruiter.');
      }
    } catch (err) {
      flash('danger', 'Network error while rejecting recruiter.');
    } finally {
      setActionLoading(null);
    }
  }

  const adminName = user?.name || 'Administrator';

  return (
    (<AppFrame
      nav={[{ id: 'verification', label: 'Recruiter verification', shortLabel: 'Verify', icon: 'ShieldCheck' }]}
      activeId="verification"
      onNavigate={() => {}}
      user={{ name: adminName, subtitle: user?.email || 'Admin', email: user?.email }}
      menuItems={[
        { label: 'Refresh', icon: 'RefreshCw', onPress: fetchDashboardData },
        { label: 'Log out', icon: 'LogOut', danger: true, onPress: onLogout },
      ]}
    >
      <Page>
        <SectionTitle
          title="Recruiter verification"
          emoji="🛡️"
          subtitle="Review new recruiter registrations before they can hire on SkillSetu."
          right={<Button label="Refresh" icon="RefreshCw" variant="secondary" onPress={fetchDashboardData} />}
        />

        {notice ? (
          <Inset tone={notice.tone} padding={space.sm}>
            <Txt variant="small" weight={600} tone="ink">{notice.text}</Txt>
          </Inset>
        ) : null}

        <View style={styles.statsRow}>
          <StatTile value={stats?.total_recruiters ?? '—'} label="Recruiters" tone="info" style={styles.stat} />
          <StatTile value={stats?.pending_recruiters ?? '—'} label="Pending" tone="warning" style={styles.stat} />
          <StatTile value={stats?.approved_recruiters ?? '—'} label="Approved" tone="success" style={styles.stat} />
          <StatTile value={stats?.rejected_recruiters ?? '—'} label="Rejected" dashed style={styles.stat} />
        </View>

        <SectionTitle title="Pending requests" size="h2" />

        {loading ? (
          <Stack gap={space.md}>
            <Skeleton height={160} />
            <Skeleton height={160} />
          </Stack>
        ) : pendingRecruiters.length === 0 ? (
          <Card>
            <EmptyState icon="CircleCheck" tone="success" title="All caught up" message="Every recruiter registration has been reviewed." />
          </Card>
        ) : (
          <View style={styles.grid}>
            {pendingRecruiters.map((item) => (
              <Card key={item.id} style={styles.card} badge={{ icon: 'Clock', tone: 'warning' }}>
                <Row gap={space.sm} align="flex-start">
                  <Avatar name={item.name} size={48} />
                  <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                    <Txt variant="h3" tone="ink" numberOfLines={1}>{item.name}</Txt>
                    <Txt variant="small" tone="muted" numberOfLines={1}>{item.designation || 'Recruiter'} · {item.company_name}</Txt>
                  </Stack>
                  <Pill label="Pending" tone="warning" size="sm" />
                </Row>
                <Stack gap={0} style={{ marginTop: space.md }}>
                  <KeyValue icon="Mail" label="Email" value={item.email} />
                  <KeyValue icon="Phone" label="Phone" value={item.phone || '—'} />
                  <KeyValue icon="Globe" label="Website" value={item.company_website || '—'} />
                  <KeyValue icon="Briefcase" label="Industry" value={item.industry || '—'} />
                  <KeyValue icon="Users" label="Size" value={item.company_size || '—'} />
                  <KeyValue icon="Calendar" label="Submitted" value={item.created_at ? formatDateTime(item.created_at) : '—'} />
                </Stack>

                {activeRejectId === item.id ? (
                  <Inset tone="danger" style={{ marginTop: space.md }}>
                    <Field
                      label="Reason (optional)"
                      placeholder="e.g. Company details could not be verified"
                      value={rejectionReason[item.id] || ''}
                      onChangeText={(text) => setRejectionReason((prev) => ({ ...prev, [item.id]: text }))}
                    />
                    <Row gap={8} style={{ marginTop: space.sm }}>
                      <Button label="Confirm rejection" size="sm" tone="danger" onPress={() => handleReject(item.id, item.name)} loading={actionLoading === item.id} />
                      <Button label="Cancel" size="sm" variant="light" onPress={() => setActiveRejectId(null)} />
                    </Row>
                  </Inset>
                ) : (
                  <Row justify="flex-end" gap={8} style={{ marginTop: space.md }}>
                    <IconButton icon="X" onPress={() => setActiveRejectId(item.id)} accessibilityLabel={tl('Reject {{name}}', {
                      name: item.name
                    })} />
                    <Button label="Approve" icon="Check" onPress={() => handleApprove(item.id, item.name)} loading={actionLoading === item.id} />
                  </Row>
                )}
              </Card>
            ))}
          </View>
        )}
      </Page>
    </AppFrame>)
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
  },
  stat: {
    flexGrow: 1,
    flexBasis: 150,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
  },
  card: {
    flexGrow: 1,
    flexBasis: 380,
  },
});
