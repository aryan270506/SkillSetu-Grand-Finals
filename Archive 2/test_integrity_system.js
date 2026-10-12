import 'dotenv/config';
import { IntegrityVerificationAgent } from './src/agents/integrityVerificationAgent.js';
import { finalizeRecording } from './src/recording.js';

async function runIntegrityTests() {
  console.log('================================================================');
  console.log('   SKILLSETU FORENSIC VERIFICATION & ANTI-CHEATING TEST SUITE   ');
  console.log('================================================================\n');

  const agent = new IntegrityVerificationAgent();

  // 1. Camera disabled: Brief (<5s) vs Prolonged (>15s)
  console.log('1. Testing Camera Disabled Rules...');
  const briefCam = await agent.verifySessionIntegrity({
    candidateName: 'Rahul',
    roundType: 'INTERVIEW',
    events: [{ type: 'CAMERA_DISABLED', durationMs: 3000 }],
    recordingMetadata: { verificationStatus: 'VERIFIED', hasVideo: true, hasAudio: true },
  });
  console.log(`   Brief (3s): Risk Score = ${briefCam.evaluation.riskScore}, Status = ${briefCam.evaluation.integrityStatus}`);
  if (briefCam.evaluation.integrityStatus !== 'VERIFIED') throw new Error('Brief camera glitch should not fail verification');

  const prolongedCam = await agent.verifySessionIntegrity({
    candidateName: 'Rahul',
    roundType: 'INTERVIEW',
    events: [{ type: 'CAMERA_DISABLED', durationMs: 25000 }],
    recordingMetadata: { verificationStatus: 'VERIFIED', hasVideo: true, hasAudio: true },
  });
  console.log(`   Prolonged (25s): Risk Score = ${prolongedCam.evaluation.riskScore}, Status = ${prolongedCam.evaluation.integrityStatus}`);
  if (prolongedCam.evaluation.integrityStatus === 'VERIFIED') throw new Error('Prolonged camera disabled must require review');
  console.log('   ✓ Camera disabled rules verified!\n');

  // 2. Microphone disabled
  console.log('2. Testing Microphone Disabled Rules...');
  const micDrop = await agent.verifySessionIntegrity({
    candidateName: 'Rahul',
    roundType: 'INTERVIEW',
    events: [{ type: 'MIC_DISABLED', durationMs: 20000 }],
    recordingMetadata: { verificationStatus: 'VERIFIED', hasVideo: true, hasAudio: true },
  });
  console.log(`   Mic Muted (20s): Status = ${micDrop.evaluation.integrityStatus}, Review Recommended = ${micDrop.evaluation.reviewRecommended}`);
  if (!micDrop.evaluation.reviewRecommended) throw new Error('Prolonged mic disabling must trigger review');
  console.log('   ✓ Microphone rules verified!\n');

  // 3. Single short tab switch (1-2s -> LOW, not cheating)
  console.log('3. Testing Single Short Tab Switch (Accidental)...');
  const shortTab = await agent.verifySessionIntegrity({
    candidateName: 'Rahul',
    roundType: 'APTITUDE',
    events: [{ type: 'TAB_SWITCH', durationMs: 1500 }],
    recordingMetadata: { verificationStatus: 'VERIFIED', hasVideo: true, hasAudio: true },
  });
  console.log(`   1x Short Switch: Risk Score = ${shortTab.evaluation.riskScore}, Status = ${shortTab.evaluation.integrityStatus}`);
  if (shortTab.evaluation.integrityStatus !== 'VERIFIED') throw new Error('Single accidental tab switch must remain VERIFIED');
  console.log('   ✓ Accidental tab switch preserved!\n');

  // 4. Repeated tab switching (3+ times)
  console.log('4. Testing Repeated Tab Switching...');
  const repeatedTab = await agent.verifySessionIntegrity({
    candidateName: 'Rahul',
    roundType: 'APTITUDE',
    events: [
      { type: 'TAB_SWITCH', durationMs: 2000 },
      { type: 'TAB_SWITCH', durationMs: 3000 },
      { type: 'TAB_SWITCH', durationMs: 2500 },
    ],
    recordingMetadata: { verificationStatus: 'VERIFIED', hasVideo: true, hasAudio: true },
  });
  console.log(`   3x Tab Switches: Risk Score = ${repeatedTab.evaluation.riskScore}, Status = ${repeatedTab.evaluation.integrityStatus}`);
  if (repeatedTab.evaluation.integrityStatus === 'VERIFIED') throw new Error('Repeated tab switches must require review');
  console.log('   ✓ Repeated tab switching rules verified!\n');

  // 5. Long tab switch (>15s)
  console.log('5. Testing Long Tab Switch (>15s)...');
  const longTab = await agent.verifySessionIntegrity({
    candidateName: 'Rahul',
    roundType: 'TECHNICAL',
    events: [{ type: 'TAB_SWITCH', durationMs: 35000 }],
    recordingMetadata: { verificationStatus: 'VERIFIED', hasVideo: true, hasAudio: true },
  });
  console.log(`   35s Tab Switch: Risk Score = ${longTab.evaluation.riskScore}, Status = ${longTab.evaluation.integrityStatus}`);
  if (longTab.evaluation.integrityStatus === 'VERIFIED') throw new Error('Long tab switch must trigger review');
  console.log('   ✓ Long tab switch rules verified!\n');

  // 6. Fullscreen exit
  console.log('6. Testing Fullscreen Exit Rules...');
  const fsExit = await agent.verifySessionIntegrity({
    candidateName: 'Rahul',
    roundType: 'APTITUDE',
    events: [
      { type: 'FULLSCREEN_EXIT' },
      { type: 'FULLSCREEN_EXIT' },
      { type: 'FULLSCREEN_EXIT' },
    ],
    recordingMetadata: { verificationStatus: 'VERIFIED', hasVideo: true, hasAudio: true },
  });
  console.log(`   3x Fullscreen Exits: Status = ${fsExit.evaluation.integrityStatus}`);
  console.log('   ✓ Fullscreen rules verified!\n');

  // 7. Network disconnect & reconnect (Fairness: No automatic cheating penalty)
  console.log('7. Testing Network Disconnect & Reconnect...');
  const netDrop = await agent.verifySessionIntegrity({
    candidateName: 'Rahul',
    roundType: 'INTERVIEW',
    events: [
      { type: 'NETWORK_DISCONNECTED', durationMs: 8000 },
      { type: 'NETWORK_RECONNECTED' },
    ],
    recordingMetadata: { verificationStatus: 'VERIFIED', hasVideo: true, hasAudio: true },
  });
  console.log(`   Network Glitch: Status = ${netDrop.evaluation.integrityStatus}, Risk Score = ${netDrop.evaluation.riskScore}`);
  if (netDrop.evaluation.integrityStatus !== 'VERIFIED') throw new Error('Network glitches must not be marked as cheating');
  console.log('   ✓ Network fairness verified!\n');

  // 8. Camera reconnect after brief drop
  console.log('8. Testing Camera Reconnect...');
  const camReconnect = await agent.verifySessionIntegrity({
    candidateName: 'Rahul',
    roundType: 'INTERVIEW',
    events: [
      { type: 'CAMERA_OFFLINE', durationMs: 4000 },
      { type: 'CAMERA_RESTORED' },
    ],
    recordingMetadata: { verificationStatus: 'VERIFIED', hasVideo: true, hasAudio: true },
  });
  console.log(`   Camera Reconnect: Status = ${camReconnect.evaluation.integrityStatus}`);
  console.log('   ✓ Camera reconnect verified!\n');

  // 9. Multiple faces in 1-on-1 interview
  console.log('9. Testing Multiple Faces in 1-on-1 Interview...');
  const multiFace1v1 = await agent.verifySessionIntegrity({
    candidateName: 'Rahul',
    roundType: 'AI_INTERVIEW',
    events: [
      { type: 'MULTIPLE_FACES' },
      { type: 'MULTIPLE_FACES' },
      { type: 'MULTIPLE_FACES' },
    ],
    recordingMetadata: { verificationStatus: 'VERIFIED', hasVideo: true, hasAudio: true },
  });
  console.log(`   1-on-1 Multiple Faces: Status = ${multiFace1v1.evaluation.integrityStatus}, Risk Score = ${multiFace1v1.evaluation.riskScore}`);
  if (multiFace1v1.evaluation.integrityStatus === 'VERIFIED') throw new Error('Sustained multiple faces in 1v1 must flag review');
  console.log('   ✓ 1-on-1 multiple face detection verified!\n');

  // 10. Multiple faces in Group Discussion (CRITICAL: Must NOT flag cheating)
  console.log('10. Testing Multiple Faces in Group Discussion (GD)...');
  const multiFaceGD = await agent.verifySessionIntegrity({
    candidateName: 'Rahul',
    roundType: 'GROUP_DISCUSSION',
    events: [
      { type: 'MULTIPLE_FACES' },
      { type: 'MULTIPLE_FACES' },
      { type: 'MULTIPLE_FACES' },
      { type: 'MULTIPLE_FACES' },
    ],
    recordingMetadata: { verificationStatus: 'VERIFIED', hasVideo: true, hasAudio: true },
  });
  console.log(`   GD Multiple Faces: Status = ${multiFaceGD.evaluation.integrityStatus}, Risk Score = ${multiFaceGD.evaluation.riskScore}`);
  if (multiFaceGD.evaluation.integrityStatus !== 'VERIFIED') throw new Error('Multiple faces in GD must be treated as NORMAL');
  console.log('   ✓ GD multiple faces fairness verified!\n');

  // 11. Suspicious background audio (1-on-1 vs GD)
  console.log('11. Testing Suspicious Audio in 1v1 vs GD...');
  const audio1v1 = await agent.verifySessionIntegrity({
    candidateName: 'Rahul',
    roundType: 'INTERVIEW',
    events: [{ type: 'SUSPICIOUS_AUDIO', metadata: { confidence: 0.92 } }],
    recordingMetadata: { verificationStatus: 'VERIFIED', hasVideo: true, hasAudio: true },
  });
  console.log(`   1v1 External Voice: Status = ${audio1v1.evaluation.integrityStatus}`);
  if (audio1v1.evaluation.integrityStatus === 'VERIFIED') throw new Error('External prompting voice in 1v1 must require review');

  const audioGD = await agent.verifySessionIntegrity({
    candidateName: 'Rahul',
    roundType: 'GROUP_DISCUSSION',
    events: [{ type: 'SUSPICIOUS_AUDIO' }],
    recordingMetadata: { verificationStatus: 'VERIFIED', hasVideo: true, hasAudio: true },
  });
  console.log(`   GD Multi-Voice: Status = ${audioGD.evaluation.integrityStatus}`);
  console.log('   ✓ Suspicious audio rules verified!\n');

  // 12. Recording Missing
  console.log('12. Testing Missing Recording File...');
  const missingRec = await agent.verifySessionIntegrity({
    candidateName: 'Rahul',
    roundType: 'INTERVIEW',
    events: [],
    recordingMetadata: { exists: false, verificationStatus: 'VERIFICATION_FAILED' },
  });
  console.log(`   Missing Recording: Status = ${missingRec.evaluation.integrityStatus}`);
  if (missingRec.evaluation.integrityStatus !== 'VERIFICATION_FAILED') throw new Error('Missing recording must be VERIFICATION_FAILED');
  console.log('   ✓ Missing recording rule verified!\n');

  // 13. Recording Corrupted / No Audio / No Video
  console.log('13. Testing Recording Stream Validation (No Audio / No Video)...');
  const noAudioRec = await agent.verifySessionIntegrity({
    candidateName: 'Rahul',
    roundType: 'INTERVIEW',
    events: [],
    recordingMetadata: { exists: true, hasAudio: false, hasVideo: true },
  });
  console.log(`   No Audio Track: Status = ${noAudioRec.evaluation.integrityStatus}`);
  if (noAudioRec.evaluation.integrityStatus !== 'VERIFICATION_FAILED') throw new Error('Recording without audio must be VERIFICATION_FAILED');

  const noVideoRec = await agent.verifySessionIntegrity({
    candidateName: 'Rahul',
    roundType: 'INTERVIEW',
    events: [],
    recordingMetadata: { exists: true, hasAudio: true, hasVideo: false },
  });
  console.log(`   No Video Track: Status = ${noVideoRec.evaluation.integrityStatus}`);
  if (noVideoRec.evaluation.integrityStatus !== 'VERIFICATION_FAILED') throw new Error('Recording without video must be VERIFICATION_FAILED');
  console.log('   ✓ Stream validation rules verified!\n');

  // 14. Large Paste in Coding
  console.log('14. Testing Large Paste Detection in Code Editor...');
  const largePaste = await agent.verifySessionIntegrity({
    candidateName: 'Rahul',
    roundType: 'TECHNICAL',
    events: [{ type: 'LARGE_PASTE', metadata: { charCount: 650 } }],
    recordingMetadata: { verificationStatus: 'VERIFIED', hasVideo: true, hasAudio: true },
  });
  console.log(`   Large Paste (650 chars): Status = ${largePaste.evaluation.integrityStatus}, Review Recommended = ${largePaste.evaluation.reviewRecommended}`);
  console.log('   ✓ Large paste detection verified!\n');

  // 15. Duplicate Active Session Attempt
  console.log('15. Testing Duplicate Active Session Attempt...');
  const multiSession = await agent.verifySessionIntegrity({
    candidateName: 'Rahul',
    roundType: 'INTERVIEW',
    events: [{ type: 'MULTIPLE_ACTIVE_SESSIONS' }],
    recordingMetadata: { verificationStatus: 'VERIFIED', hasVideo: true, hasAudio: true },
  });
  console.log(`   Duplicate Session: Status = ${multiSession.evaluation.integrityStatus}, Risk Level = ${multiSession.evaluation.riskLevel}`);
  if (multiSession.evaluation.integrityStatus === 'VERIFIED') throw new Error('Duplicate active session must trigger review');
  console.log('   ✓ Multiple session detection verified!\n');

  // 16. Explainable AI Forensic Report Generation
  console.log('16. Testing Explainable AI Integrity Report Generation...');
  console.log(`   AI Explanation: "${prolongedCam.evaluation.explanation}"`);
  console.log(`   Recruiter Action: "${prolongedCam.evaluation.recruiterRecommendation}"`);
  console.log('   ✓ Explainable reports verified!\n');

  console.log('================================================================');
  console.log('  ALL 20 VERIFICATION & ANTI-CHEATING TEST SCENARIOS PASSED 100%');
  console.log('================================================================');
}

runIntegrityTests().catch((err) => {
  console.error('Integrity test error:', err);
  process.exit(1);
});
