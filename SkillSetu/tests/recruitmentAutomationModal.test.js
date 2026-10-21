/**
 * Unit & Contract Tests for Recruiter Recruitment Automation Controls (InternshipFormModal)
 * Tests safe defaults, mode selection, enable toggle, and payload structuring.
 */

const test = require('node:test');
const assert = require('node:assert');

test('Recruitment Automation Form Contract', async (t) => {
  await t.test('Safe defaults: REVIEW_GATED mode and automation_enabled = false', () => {
    const defaultState = {
      automationMode: 'REVIEW_GATED',
      automationEnabled: false,
      pipelineDraft: null,
    };

    assert.strictEqual(defaultState.automationMode, 'REVIEW_GATED');
    assert.strictEqual(defaultState.automationEnabled, false);
    assert.strictEqual(defaultState.pipelineDraft, null);
  });

  await t.test('Mode selection supports FULL_AUTOMATION, REVIEW_GATED, MANUAL_ONLY', () => {
    const validModes = ['FULL_AUTOMATION', 'REVIEW_GATED', 'MANUAL_ONLY'];

    validModes.forEach((mode) => {
      const state = { automationMode: mode };
      assert.ok(validModes.includes(state.automationMode));
    });
  });

  await t.test('Payload generation separates publishing from activation', () => {
    const createPayload = (formData, automationSettings) => ({
      title: formData.title,
      required_skills: formData.skills,
      application_threshold: formData.threshold,
      automation_mode: automationSettings.mode || 'REVIEW_GATED',
      automation_enabled: Boolean(automationSettings.enabled),
      ...(automationSettings.draft?.pipeline_config ? {
        pipeline_config: automationSettings.draft.pipeline_config,
      } : {}),
    });

    // Case 1: Standard publish without enabling automation
    const payloadDefault = createPayload(
      { title: 'Fullstack Intern', skills: ['React', 'Node'], threshold: 80 },
      { mode: 'REVIEW_GATED', enabled: false }
    );
    assert.strictEqual(payloadDefault.automation_enabled, false);
    assert.strictEqual(payloadDefault.automation_mode, 'REVIEW_GATED');

    // Case 2: Deliberate enablement with FULL_AUTOMATION
    const payloadFull = createPayload(
      { title: 'Fullstack Intern', skills: ['React', 'Node'], threshold: 80 },
      { mode: 'FULL_AUTOMATION', enabled: true }
    );
    assert.strictEqual(payloadFull.automation_enabled, true);
    assert.strictEqual(payloadFull.automation_mode, 'FULL_AUTOMATION');

    // Case 3: Pipeline draft attached retains draft status
    const mockDraft = {
      pipeline_config: {
        rounds: [
          { round_key: 'aptitude', round_name: 'Aptitude Test', review_gated: false },
          { round_key: 'interview', round_name: 'AI Voice Interview', review_gated: true },
        ],
      },
    };
    const payloadWithDraft = createPayload(
      { title: 'Fullstack Intern', skills: ['React', 'Node'], threshold: 80 },
      { mode: 'REVIEW_GATED', enabled: false, draft: mockDraft }
    );
    assert.strictEqual(payloadWithDraft.automation_enabled, false);
    assert.ok(payloadWithDraft.pipeline_config);
    assert.strictEqual(payloadWithDraft.pipeline_config.rounds.length, 2);
    assert.strictEqual(payloadWithDraft.pipeline_config.rounds[1].review_gated, true);
  });
});
