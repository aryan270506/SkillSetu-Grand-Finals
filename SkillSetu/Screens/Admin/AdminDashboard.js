import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  TextInput,
} from 'react-native';

export default function AdminDashboard({ user, onLogout }) {
  const [stats, setStats] = useState(null);
  const [pendingRecruiters, setPendingRecruiters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectionReason, setRejectionReason] = useState({});
  const [activeRejectId, setActiveRejectId] = useState(null);

  const token = user?.token;

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);
    try {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };

      // 1. Fetch Stats
      const statsRes = await fetch('http://127.0.0.1:8000/api/v1/admin/dashboard/stats', { headers });
      const statsData = await statsRes.json();
      if (statsRes.ok && statsData.status === 'success') {
        setStats(statsData.stats);
      }

      // 2. Fetch Pending Recruiters
      const pendingRes = await fetch('http://127.0.0.1:8000/api/v1/admin/recruiters/pending', { headers });
      const pendingData = await pendingRes.json();
      if (pendingRes.ok && pendingData.status === 'success') {
        setPendingRecruiters(pendingData.recruiters || []);
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(recruiterId, recruiterName) {
    setActionLoading(recruiterId);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/admin/recruiters/${recruiterId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        Alert.alert('Approved', `Recruiter '${recruiterName}' has been approved successfully!`);
        fetchDashboardData();
      } else {
        Alert.alert('Error', data.detail || 'Could not approve recruiter.');
      }
    } catch (err) {
      Alert.alert('Error', 'Network error while approving recruiter.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(recruiterId, recruiterName) {
    setActionLoading(recruiterId);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/admin/recruiters/${recruiterId}/reject`, {
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
        Alert.alert('Rejected', `Recruiter '${recruiterName}' registration rejected.`);
        setActiveRejectId(null);
        fetchDashboardData();
      } else {
        Alert.alert('Error', data.detail || 'Could not reject recruiter.');
      }
    } catch (err) {
      Alert.alert('Error', 'Network error while rejecting recruiter.');
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🛡️ Admin Control Panel</Text>
          <Text style={styles.headerSub}>SkillSetu Recruiter Verification System</Text>
        </View>
        <Pressable style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Stats Row */}
        <Text style={styles.sectionTitle}>Real-time Database Overview</Text>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderLeftColor: '#3B82F6' }]}>
            <Text style={styles.statNum}>{stats?.total_recruiters ?? '-'}</Text>
            <Text style={styles.statLabel}>Total Recruiters</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: '#F59E0B' }]}>
            <Text style={[styles.statNum, { color: '#D97706' }]}>{stats?.pending_recruiters ?? '-'}</Text>
            <Text style={styles.statLabel}>Pending Verification</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: '#10B981' }]}>
            <Text style={[styles.statNum, { color: '#059669' }]}>{stats?.approved_recruiters ?? '-'}</Text>
            <Text style={styles.statLabel}>Approved Accounts</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: '#EF4444' }]}>
            <Text style={[styles.statNum, { color: '#DC2626' }]}>{stats?.rejected_recruiters ?? '-'}</Text>
            <Text style={styles.statLabel}>Rejected Registrations</Text>
          </View>
        </View>

        {/* Refresh & Section Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Pending Recruiter Verification Requests</Text>
          <Pressable style={styles.refreshBtn} onPress={fetchDashboardData}>
            <Text style={styles.refreshText}>🔄 Refresh List</Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#0F5A47" style={{ marginVertical: 30 }} />
        ) : pendingRecruiters.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>🎉 No Pending Verification Requests!</Text>
            <Text style={styles.emptySub}>All recruiter registrations have been reviewed.</Text>
          </View>
        ) : (
          pendingRecruiters.map((item) => (
            <View key={item.id} style={styles.recruiterCard}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.recruiterName}>{item.name}</Text>
                  <Text style={styles.designation}>{item.designation || 'Recruiter'} • {item.company_name}</Text>
                </View>
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>PENDING</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.detailsGrid}>
                <Text style={styles.detailItem}><Text style={styles.detailBold}>Email:</Text> {item.email}</Text>
                <Text style={styles.detailItem}><Text style={styles.detailBold}>Phone:</Text> {item.phone || 'N/A'}</Text>
                <Text style={styles.detailItem}><Text style={styles.detailBold}>Website:</Text> {item.company_website || 'N/A'}</Text>
                <Text style={styles.detailItem}><Text style={styles.detailBold}>Industry:</Text> {item.industry || 'N/A'}</Text>
                <Text style={styles.detailItem}><Text style={styles.detailBold}>Size:</Text> {item.company_size || 'N/A'}</Text>
                <Text style={styles.detailItem}><Text style={styles.detailBold}>Submitted:</Text> {item.created_at ? new Date(item.created_at).toLocaleString() : 'Recently'}</Text>
              </View>

              {/* Rejection Input Box if toggled */}
              {activeRejectId === item.id && (
                <View style={styles.rejectionInputBox}>
                  <Text style={styles.rejectionLabel}>Rejection Reason (Optional):</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Invalid company details or document mismatch"
                    value={rejectionReason[item.id] || ''}
                    onChangeText={(text) => setRejectionReason((prev) => ({ ...prev, [item.id]: text }))}
                  />
                  <View style={styles.confirmBtnRow}>
                    <Pressable
                      style={[styles.btn, styles.rejectConfirmBtn]}
                      onPress={() => handleReject(item.id, item.name)}
                    >
                      <Text style={styles.btnText}>Confirm Rejection</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.btn, styles.cancelBtn]}
                      onPress={() => setActiveRejectId(null)}
                    >
                      <Text style={styles.cancelText}>Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              {activeRejectId !== item.id && (
                <View style={styles.actionRow}>
                  <Pressable
                    disabled={actionLoading === item.id}
                    style={[styles.actionBtn, styles.approveBtn]}
                    onPress={() => handleApprove(item.id, item.name)}
                  >
                    {actionLoading === item.id ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.actionBtnText}>✅ Approve Recruiter</Text>
                    )}
                  </Pressable>

                  <Pressable
                    disabled={actionLoading === item.id}
                    style={[styles.actionBtn, styles.rejectBtn]}
                    onPress={() => setActiveRejectId(item.id)}
                  >
                    <Text style={styles.rejectBtnText}>❌ Reject Registration</Text>
                  </Pressable>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAF9' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F5A47',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  headerSub: { color: '#A7F3D0', fontSize: 12, marginTop: 2 },
  logoutBtn: { backgroundColor: '#047857', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6 },
  logoutText: { color: '#FFF', fontWeight: '600', fontSize: 13 },

  content: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginVertical: 12 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15 },
  refreshBtn: { backgroundColor: '#E5E7EB', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  refreshText: { fontSize: 12, fontWeight: '600', color: '#374151' },

  statsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statCard: {
    width: '48%',
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  statNum: { fontSize: 24, fontWeight: '800', color: '#1F2937' },
  statLabel: { fontSize: 12, color: '#6B7280', marginTop: 4 },

  emptyCard: { backgroundColor: '#FFF', padding: 30, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#059669' },
  emptySub: { fontSize: 13, color: '#6B7280', marginTop: 4 },

  recruiterCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  recruiterName: { fontSize: 17, fontWeight: '700', color: '#111827' },
  designation: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  pendingBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  pendingBadgeText: { color: '#D97706', fontSize: 11, fontWeight: '700' },

  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },

  detailsGrid: { marginBottom: 14 },
  detailItem: { fontSize: 13, color: '#374151', marginBottom: 5 },
  detailBold: { fontWeight: '600', color: '#1F2937' },

  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  approveBtn: { backgroundColor: '#059669' },
  actionBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  rejectBtn: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FCA5A5' },
  rejectBtnText: { color: '#DC2626', fontWeight: '700', fontSize: 13 },

  rejectionInputBox: { marginTop: 10, padding: 12, backgroundColor: '#FEF2F2', borderRadius: 8 },
  rejectionLabel: { fontSize: 12, fontWeight: '600', color: '#991B1B', marginBottom: 6 },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 6, padding: 8, fontSize: 13 },
  confirmBtnRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 6, alignItems: 'center' },
  rejectConfirmBtn: { backgroundColor: '#DC2626' },
  btnText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  cancelBtn: { backgroundColor: '#E5E7EB' },
  cancelText: { color: '#374151', fontWeight: '600', fontSize: 12 },
});
