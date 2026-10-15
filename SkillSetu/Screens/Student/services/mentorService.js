import { API_BASE } from '../../../ui/config';

/**
 * SkillSetu Personal AI Career Mentor Service.
 * Connects frontend directly to backend GroqMentorService, StudentContextService, and authorized tools.
 */

/**
 * Sends a message to the authenticated student's Personal AI Mentor.
 * @param {string} email - Authenticated student email
 * @param {string} message - User question / prompt
 * @param {number|null} conversationId - Optional ongoing conversation ID
 */
export async function sendMessageToMentor(email, message, conversationId = null) {
  try {
    const res = await fetch(`${API_BASE}/mentor/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Email': email || '',
        'Authorization': email ? `Bearer ${email}` : '',
      },
      body: JSON.stringify({
        message,
        conversation_id: conversationId,
        email: email || undefined,
      }),
    });

    const data = await res.json();
    if (res.ok && data) {
      return {
        id: data.id || Date.now(),
        conversation_id: data.conversation_id,
        sender: 'ai',
        text: data.text || 'I analyzed your request.',
        richContent: data.richContent || null,
        timestamp: data.timestamp || 'Now',
        toolsUsed: data.toolsUsed || [],
      };
    }

    throw new Error(data?.detail || 'Failed to receive mentor response');
  } catch (err) {
    console.error('[MentorService] chat error:', err);
    throw err;
  }
}

/**
 * Fetches conversation history for the authenticated student.
 * @param {string} email - Authenticated student email
 * @param {number|null} conversationId - Optional conversation ID
 */
export async function fetchMentorHistory(email, conversationId = null) {
  try {
    const queryParams = new URLSearchParams();
    if (email) queryParams.append('email', email);
    if (conversationId) queryParams.append('conversation_id', conversationId);

    const res = await fetch(`${API_BASE}/mentor/history?${queryParams.toString()}`, {
      headers: {
        'X-User-Email': email || '',
        'Authorization': email ? `Bearer ${email}` : '',
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data) {
        return {
          conversationId: data.conversation_id,
          messages: (data.messages || []).map(m => ({
            id: m.id || Math.random(),
            sender: m.sender || 'ai',
            text: m.text || m.content || '',
            richContent: m.richContent || null,
            timestamp: m.timestamp || 'Recently',
          })),
        };
      }
    }
    return null;
  } catch (err) {
    return null;
  }
}

/**
 * Resets or clears the active conversation to start a fresh guidance session.
 * @param {string} email - Authenticated student email
 */
export async function resetMentorConversation(email) {
  try {
    const res = await fetch(`${API_BASE}/mentor/reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Email': email || '',
        'Authorization': email ? `Bearer ${email}` : '',
      },
      body: JSON.stringify({
        email: email || undefined,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return data || null;
    }
    return null;
  } catch (err) {
    return null;
  }
}

/**
 * Fetches personalized dynamic suggested prompts for the student.
 * @param {string} email - Authenticated student email
 */
export async function fetchSuggestedPrompts(email) {
  try {
    const emailParam = email ? `?email=${encodeURIComponent(email)}` : '';
    const res = await fetch(`${API_BASE}/mentor/suggested-prompts${emailParam}`, {
      headers: {
        'X-User-Email': email || '',
        'Authorization': email ? `Bearer ${email}` : '',
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.suggested_prompts && Array.isArray(data.suggested_prompts) && data.suggested_prompts.length > 0) {
        return data.suggested_prompts;
      }
    }
    return [
      "What internships match my profile?",
      "What skills am I missing for my target role?",
      "What should I learn next?",
      "How can I improve my resume ATS score?",
      "Am I ready for a technical interview?"
    ];
  } catch (err) {
    return [
      "What internships match my profile?",
      "What skills am I missing?",
      "What should I learn next?",
      "Am I ready for my target career?",
      "Improve my resume"
    ];
  }
}
