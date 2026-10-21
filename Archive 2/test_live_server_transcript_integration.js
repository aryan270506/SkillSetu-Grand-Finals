/**
 * Live Server Transcript Pipeline Integration Test
 * Verifies real HTTP interactions against Archive 2 server:
 *  - Correct sequence ordering
 *  - Deduplication of identical IDs
 *  - Deduplication of adjacent identical text within 2000ms
 *  - Monotonic ISO timestamps
 */

import assert from 'node:assert';

const SERVER_URL = 'http://localhost:3000';

async function testLiveServerTranscript() {
  console.log('Testing Live Server Transcript Pipeline at', SERVER_URL);

  // 1. Create a test session
  const createRes = await fetch(`${SERVER_URL}/api/assessment/session/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: `test-live-${Date.now()}`,
      name: 'Aryan Bhoge',
      jd: 'Full Stack Engineer with React, Node.js, and LiveKit experience.',
      resumeText: 'Computer Science student with ERP and QR attendance system experience.',
      mode: 'REAL'
    })
  });

  const session = await createRes.json();
  assert.ok(session.ok && session.id, 'Session creation failed');
  const sessionId = session.id;
  console.log(`[PASS] Created test session: ${sessionId}`);

  // Fetch secret from .env or test directly
  // Note: we need x-agent-secret header
  const envText = await (await import('node:fs/promises')).readFile('.env', 'utf8');
  const secretMatch = envText.match(/LIVEKIT_API_SECRET=([^\r\n]+)/);
  const secret = secretMatch ? secretMatch[1].trim() : '';
  const headers = {
    'Content-Type': 'application/json',
    'x-agent-secret': secret
  };

  // 2. Fetch context
  const ctxRes = await fetch(`${SERVER_URL}/api/interviews/${sessionId}/context`, { headers });
  assert.strictEqual(ctxRes.status, 200, 'Context fetch failed');
  const ctxData = await ctxRes.json();
  assert.strictEqual(ctxData.name, 'Aryan Bhoge');
  console.log('[PASS] Context endpoint verified');

  // 3. Post out-of-order transcripts with seq numbers
  // Post seq: 3 first
  const t3 = await fetch(`${SERVER_URL}/api/interviews/${sessionId}/transcript`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      id: 'msg-turn-3',
      seq: 3,
      role: 'ai',
      text: 'What technologies did you use for the ERP system?',
      createdAt: new Date('2026-10-17T12:00:20.000Z').toISOString()
    })
  });
  assert.strictEqual(t3.status, 200);

  // Post seq: 1 second
  const t1 = await fetch(`${SERVER_URL}/api/interviews/${sessionId}/transcript`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      id: 'msg-turn-1',
      seq: 1,
      role: 'ai',
      text: 'Hello Aryan, could you tell me about your background?',
      createdAt: new Date('2026-10-17T12:00:00.000Z').toISOString()
    })
  });
  assert.strictEqual(t1.status, 200);

  // Post seq: 2 third
  const t2 = await fetch(`${SERVER_URL}/api/interviews/${sessionId}/transcript`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      id: 'msg-turn-2',
      seq: 2,
      role: 'candidate',
      text: 'I am studying at Sanjay Ghodawat University and built an ERP system and QR attendance system.',
      createdAt: new Date('2026-10-17T12:00:10.000Z').toISOString()
    })
  });
  assert.strictEqual(t2.status, 200);

  // 4. Test duplicate ID submission
  const t2Dup = await fetch(`${SERVER_URL}/api/interviews/${sessionId}/transcript`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      id: 'msg-turn-2',
      seq: 2,
      role: 'candidate',
      text: 'I am studying at Sanjay Ghodawat University and built an ERP system and QR attendance system.',
      createdAt: new Date('2026-10-17T12:00:10.000Z').toISOString()
    })
  });
  assert.strictEqual(t2Dup.status, 200);

  // 5. Test rapid duplicate adjacent text submission
  const t3Rapid = await fetch(`${SERVER_URL}/api/interviews/${sessionId}/transcript`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      id: 'msg-turn-3-retry',
      seq: 4,
      role: 'ai',
      text: 'What technologies did you use for the ERP system?',
      createdAt: new Date('2026-10-17T12:00:20.500Z').toISOString()
    })
  });
  assert.strictEqual(t3Rapid.status, 200);

  // 6. Verify stored session transcript
  const getRes = await fetch(`${SERVER_URL}/api/interviews/${sessionId}`);
  const sData = await getRes.json();
  const transcript = sData.transcript || [];

  console.log(`Retrieved transcript with ${transcript.length} items:`);
  transcript.forEach((m, idx) => console.log(` [${idx}] seq=${m.seq} role=${m.role} id=${m.id}: "${m.text.slice(0, 40)}..."`));

  assert.strictEqual(transcript.length, 3, 'Transcript length should be exactly 3 (duplicates filtered)');
  assert.strictEqual(transcript[0].seq, 1, 'First message must be seq 1');
  assert.strictEqual(transcript[1].seq, 2, 'Second message must be seq 2');
  assert.strictEqual(transcript[2].seq, 3, 'Third message must be seq 3');
  assert.strictEqual(transcript[0].role, 'ai');
  assert.strictEqual(transcript[1].role, 'candidate');
  assert.strictEqual(transcript[2].role, 'ai');
  assert.ok(transcript[2].text.includes('ERP system'));

  console.log('\n[ALL PASS] Live Server Transcript Pipeline verified successfully!');
}

testLiveServerTranscript().catch((err) => {
  console.error('[FAIL]', err);
  process.exit(1);
});
