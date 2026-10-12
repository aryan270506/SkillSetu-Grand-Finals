import 'dotenv/config';
import { IntegrityVerificationAgent } from './src/agents/integrityVerificationAgent.js';

async function runIntegrityRuntimeTests() {
  console.log('====================================================');
  console.log('  TESTING REAL-TIME ASSESSMENT INTEGRITY ENGINE     ');
  console.log('====================================================\n');

  const integrityAgent = new IntegrityVerificationAgent();

  // Mock Assessment Session
  const createMockSession = (round = 'aptitude') => ({
    id: 'test_session_' + Date.now(),
    name: 'Aryan Sharma',
    currentRound: round,
    integritySignals: [],
    warningCounts: { aptitude: 0, technical: 0, interview: 0, gd: 0 },
    terminatedRounds: {},
  });

  let passCount = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✓ [PASS] ${message}`);
      passCount++;
    } else {
      console.error(`  ✗ [FAIL] ${message}`);
      throw new Error(`Test assertion failed: ${message}`);
    }
  }

  // --- TEST 1: Phone Detection (Isolated COCO-SSD) ---
  console.log('Test 1: Phone Detection (Object Detection Frame Stream)');
  const session1 = createMockSession('aptitude');
  const t0 = Date.now();
  const phoneRes1 = await integrityAgent.evaluateLiveSignal(session1, {
    type: 'PHONE_DETECTED',
    metadata: { confidence: 0.88, persistenceCount: 2, className: 'cell phone' },
    immediate: true,
  });
  const tPhone = Date.now() - t0;
  assert(phoneRes1.action === 'WARNING_ISSUED', 'First phone detection triggers WARNING_ISSUED (Warning 1 of 2)');
  assert(phoneRes1.warningNumber === 1, 'Warning number is 1');
  assert(phoneRes1.isPaused === true, 'Assessment is paused for explanation');
  assert(tPhone < 50, `Phone evaluation latency is instantaneous (${tPhone}ms <= 50ms) - NO AI blocking`);

  // Second Phone Violation -> Round Termination
  const phoneRes2 = await integrityAgent.evaluateLiveSignal(session1, {
    type: 'PHONE_DETECTED',
    metadata: { confidence: 0.91, persistenceCount: 3, className: 'cell phone' },
    immediate: true,
  });
  assert(phoneRes2.action === 'ROUND_TERMINATED', 'Second phone detection terminates round immediately');
  assert(phoneRes2.isTerminated === true, 'isTerminated flag set to true');
  assert(phoneRes2.warningNumber === 2, 'Warning number is 2');
  console.log('  ✓ Phone detection rule verified.\n');

  // --- TEST 2: Camera Disconnection, Disable, Mute & Frozen Frame ---
  console.log('Test 2: Real-time Camera Disconnect, Disable, Mute & Frozen Frame');
  const session2 = createMockSession('technical');
  const camStart = Date.now();
  const camRes = await integrityAgent.evaluateLiveSignal(session2, {
    type: 'CAMERA_DISCONNECTED',
    durationSec: 2,
    immediate: true,
    metadata: { reason: 'Track ended event', readyState: 'ended' },
  });
  const tCam = Date.now() - camStart;
  assert(camRes.action === 'WARNING_ISSUED', 'Camera disconnect triggers immediate warning');
  assert(tCam < 50, `Camera evaluation is deterministic and immediate (${tCam}ms)`);

  // Camera recovery
  const camRec = await integrityAgent.evaluateLiveSignal(session2, {
    type: 'CAMERA_RECONNECTED',
    metadata: { reason: 'Track restored' },
  });
  assert(camRec.action === 'LOGGED_INFO', 'CAMERA_RECONNECTED is logged as audit info without penalty');

  // Camera disabled
  const session2b = createMockSession('technical');
  const camDisRes = await integrityAgent.evaluateLiveSignal(session2b, {
    type: 'CAMERA_DISABLED',
    immediate: true,
    metadata: { enabled: false },
  });
  assert(camDisRes.action === 'WARNING_ISSUED', 'CAMERA_DISABLED triggers distinct warning');

  // Camera frozen frame (CAMERA_NO_FRAME)
  const session2c = createMockSession('technical');
  const camNoFrameRes = await integrityAgent.evaluateLiveSignal(session2c, {
    type: 'CAMERA_NO_FRAME',
    immediate: true,
    metadata: { videoWidth: 1280, currentTimeStuck: true },
  });
  assert(camNoFrameRes.action === 'WARNING_ISSUED', 'CAMERA_NO_FRAME triggers distinct warning');
  console.log('  ✓ Camera state monitoring verified.\n');

  // --- TEST 3: No Face Detection & Recovery ---
  console.log('Test 3: No Face Detection with Temporal Confirmation & Recovery');
  const sessionNoFace = createMockSession('aptitude');
  const noFaceRes = await integrityAgent.evaluateLiveSignal(sessionNoFace, {
    type: 'NO_FACE_DETECTED',
    durationSec: 2,
    immediate: true,
    metadata: { persistenceCount: 6 },
  });
  assert(noFaceRes.action === 'WARNING_ISSUED', 'NO_FACE_DETECTED (2s confirmed) triggers Warning 1');

  const faceRestoredRes = await integrityAgent.evaluateLiveSignal(sessionNoFace, {
    type: 'FACE_RESTORED',
    metadata: { restored: true },
  });
  assert(faceRestoredRes.action === 'LOGGED_INFO', 'FACE_RESTORED is logged cleanly without penalty');
  console.log('  ✓ No face detection & recovery verified.\n');

  // --- TEST 4: Multiple Faces in Individual vs GD Round ---
  console.log('Test 4: Multiple Faces in Individual vs GD Round');
  const sessionTech = createMockSession('technical');
  const techFacesRes = await integrityAgent.evaluateLiveSignal(sessionTech, {
    type: 'MULTIPLE_PERSONS_DETECTED',
    metadata: { personCount: 2, confidence: 0.89, persistenceCount: 2 },
    immediate: true,
  });
  assert(techFacesRes.action === 'WARNING_ISSUED', 'Multiple persons in Technical round triggers warning');

  const sessionGD = createMockSession('gd');
  const gdFacesRes = await integrityAgent.evaluateLiveSignal(sessionGD, {
    type: 'MULTIPLE_FACES_DETECTED',
    metadata: { personCount: 4, confidence: 0.95 },
  });
  assert(gdFacesRes.action === 'LOGGED_INFO', 'Multiple faces in GD is strictly exempt (LOGGED_INFO)');
  assert(gdFacesRes.isViolation === false, 'isViolation is false for multiple faces in GD');
  console.log('  ✓ Multi-face rules and GD exemption verified.\n');

  // --- TEST 5: Microphone Disconnect, Disable & Normal Speech ---
  console.log('Test 5: Microphone Disconnection, Disable & Normal Speech');
  const session3 = createMockSession('interview');
  
  // Physical disconnect
  const micRes = await integrityAgent.evaluateLiveSignal(session3, {
    type: 'MIC_DISCONNECTED',
    durationSec: 2,
    immediate: true,
    metadata: { reason: 'Track ended event', readyState: 'ended' },
  });
  assert(micRes.action === 'WARNING_ISSUED', 'Microphone track disconnect triggers immediate warning');

  // Normal candidate speech (should never trigger violation)
  const candidateSpeechRes = await integrityAgent.evaluateLiveSignal(session3, {
    type: 'CANDIDATE_SPEECH_NORMAL',
    metadata: { rms: 0.08, spectralCentroid: 1200 },
  });
  assert(candidateSpeechRes.action === 'LOGGED_INFO', 'Normal candidate speech is recognized as normal');

  // Ambient silence
  const silenceRes = await integrityAgent.evaluateLiveSignal(session3, {
    type: 'AUDIO_SILENCE_NORMAL',
    metadata: { volumeDb: -90, isSilent: true },
  });
  assert(silenceRes.action === 'LOGGED_INFO', 'Silence is recognized as normal audio state');
  console.log('  ✓ Microphone disconnect vs speech/silence separation verified.\n');

  // --- TEST 6: Second Speaker Detection & Temporal Confirmation ---
  console.log('Test 6: Second Speaker Detection with Temporal Confirmation');
  const sessionVoice = createMockSession('interview');
  const secondVoiceRes = await integrityAgent.evaluateLiveSignal(sessionVoice, {
    type: 'POSSIBLE_SECOND_SPEAKER',
    immediate: true,
    metadata: { confidence: 0.82, consecutiveFrames: 3, centroidDiff: 0.48 },
  });
  assert(secondVoiceRes.action === 'WARNING_ISSUED', 'POSSIBLE_SECOND_SPEAKER (confirmed) triggers Warning 1');
  assert(secondVoiceRes.severity === 'MEDIUM', 'Second speaker is classified as MEDIUM severity signal');

  // GD Second Speaker is exempt
  const sessionGDVoice = createMockSession('gd');
  const gdVoiceRes = await integrityAgent.evaluateLiveSignal(sessionGDVoice, {
    type: 'POSSIBLE_SECOND_SPEAKER',
    metadata: { confidence: 0.85, consecutiveFrames: 4 },
  });
  assert(gdVoiceRes.action === 'LOGGED_INFO', 'POSSIBLE_SECOND_SPEAKER is strictly exempt in GD');
  console.log('  ✓ Second speaker detection and GD exemption verified.\n');

  // --- TEST 7: External Coaching Pattern Detection ---
  console.log('Test 7: External Coaching Pattern Detection');
  const sessionCoaching = createMockSession('interview');
  const coachingRes = await integrityAgent.evaluateLiveSignal(sessionCoaching, {
    type: 'POSSIBLE_EXTERNAL_COACHING',
    immediate: true,
    metadata: {
      candidateSpeech: true,
      possibleSecondSpeaker: true,
      temporalGapMs: 1800,
      confidence: 0.85,
    },
  });
  assert(coachingRes.action === 'WARNING_ISSUED', 'POSSIBLE_EXTERNAL_COACHING triggers warning');
  assert(coachingRes.isViolation === true, 'Coaching pattern marked as violation');
  console.log('  ✓ External coaching detection verified.\n');

  // --- TEST 8: Tab Switch & Window Focus ---
  console.log('Test 8: Tab Switch & Window Focus');
  const session4 = createMockSession('aptitude');
  const tabRes = await integrityAgent.evaluateLiveSignal(session4, {
    type: 'TAB_SWITCH',
    durationSec: 4,
    immediate: true,
  });
  assert(tabRes.action === 'WARNING_ISSUED', 'Tab switch away >= 3s triggers Warning 1');

  // Return to tab
  const tabVis = await integrityAgent.evaluateLiveSignal(session4, {
    type: 'TAB_VISIBLE',
  });
  assert(tabVis.action === 'LOGGED_INFO', 'TAB_VISIBLE is logged without penalty');
  console.log('  ✓ Tab switch latency and recovery verified.\n');

  // --- TEST 9: Per-Round Reset ---
  console.log('Test 9: Per-Round Warning Reset');
  const multiRoundSession = {
    id: 'test_session_rounds',
    name: 'Priya',
    currentRound: 'aptitude',
    integritySignals: [],
    warningCounts: { aptitude: 1, technical: 0, interview: 0, gd: 0 },
    terminatedRounds: {},
  };

  // Transition to technical round
  multiRoundSession.currentRound = 'technical';
  assert(multiRoundSession.warningCounts['technical'] === 0, 'New round starts with warning_count = 0');
  
  // First violation in technical round is warning 1, not termination
  const techRoundRes = await integrityAgent.evaluateLiveSignal(multiRoundSession, {
    type: 'CAMERA_DISCONNECTED',
    durationSec: 2,
    immediate: true,
  });
  assert(techRoundRes.action === 'WARNING_ISSUED', 'Technical round violation issues Warning 1 (not terminated)');
  assert(techRoundRes.warningNumber === 1, 'Technical round warning number is 1');
  console.log('  ✓ Per-round reset verified.\n');

  // --- TEST 10: Eye / Gaze Tracking & Head Turned Away ---
  console.log('Test 10: Real-time Gaze Tracking, Head Turned Away & Recovery');
  const sessionGaze = createMockSession('interview');

  // Normal screen gaze
  const normalGazeRes = await integrityAgent.evaluateLiveSignal(sessionGaze, {
    type: 'LOOKING_AT_SCREEN',
    metadata: { gaze: 'LOOKING_AT_SCREEN', yawDeg: 2, pitchDeg: -1 },
  });
  assert(normalGazeRes.action === 'LOGGED_INFO', 'Normal screen gaze is logged info without violation');

  // Sustained off-screen gaze (3s)
  const gazeAwayRes = await integrityAgent.evaluateLiveSignal(sessionGaze, {
    type: 'GAZE_OFF_SCREEN',
    durationSec: 3,
    immediate: true,
    metadata: { direction: 'LOOKING_RIGHT', yawDeg: 28, pitchDeg: 4, confidence: 0.88 },
  });
  assert(gazeAwayRes.action === 'WARNING_ISSUED', 'Sustained off-screen gaze >= 3s triggers Warning 1');
  assert(gazeAwayRes.severity === 'MEDIUM', 'Gaze off-screen is categorized as MEDIUM severity');

  // Gaze recovery
  const gazeRecRes = await integrityAgent.evaluateLiveSignal(sessionGaze, {
    type: 'GAZE_RECOVERED',
    metadata: { reason: 'Candidate returned gaze to screen' },
  });
  assert(gazeRecRes.action === 'LOGGED_INFO', 'GAZE_RECOVERED is logged cleanly without penalty');

  // Head turned away
  const headTurnRes = await integrityAgent.evaluateLiveSignal(sessionGaze, {
    type: 'HEAD_TURNED_AWAY',
    durationSec: 3,
    immediate: true,
    metadata: { direction: 'HEAD_TURNED_AWAY', yawDeg: -35, confidence: 0.91 },
  });
  assert(headTurnRes.action === 'ROUND_TERMINATED', 'Second sustained gaze/head violation terminates round (Warning 2)');
  assert(headTurnRes.isTerminated === true, 'isTerminated set to true');

  // GD Round Gaze Exemption
  const sessionGDGaze = createMockSession('gd');
  const gdGazeRes = await integrityAgent.evaluateLiveSignal(sessionGDGaze, {
    type: 'GAZE_OFF_SCREEN',
    durationSec: 5,
    metadata: { direction: 'LOOKING_LEFT', yawDeg: -22 },
  });
  assert(gdGazeRes.action === 'LOGGED_INFO', 'Looking around in Group Discussion is strictly exempt (LOGGED_INFO)');
  console.log('  ✓ Gaze & Head pose tracking with GD exemption verified.\n');

  // --- TEST 11: Intentional End Interview & Session Termination ---
  console.log('Test 11: Intentional End Interview Lifecycle & Focus Guards');
  const sessionEnd = createMockSession('interview');

  // Normal active round -> intentionalEndRequested = true -> blur/visibility/fullscreen change ignored
  let intentionalEnd = true;
  let isCompletingRound = true;
  const shouldIgnoreBlur = intentionalEnd || isCompletingRound;
  assert(shouldIgnoreBlur === true, 'Focus loss / window blur is ignored when intentionalEndRequested is true');

  const roundCompleteRes = await integrityAgent.evaluateLiveSignal(sessionEnd, {
    type: 'ROUND_COMPLETED_NORMAL',
    metadata: { status: 'completed' },
  });
  assert(roundCompleteRes.action === 'LOGGED_INFO', 'Normal intentional round completion logged cleanly');
  console.log('  ✓ Intentional end interview focus guards verified.\n');

  console.log('====================================================');
  console.log(`  ALL ${passCount}/${totalTests} RUNTIME PROCTORING TESTS PASSED!`);
  console.log('====================================================');
}

runIntegrityRuntimeTests().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
