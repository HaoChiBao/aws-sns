import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isAuthenticated } from '../../src/auth-vercel.js';
import { updatePhoneNumberNickname } from '../../src/data.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isAuthenticated(req)) {
    res.status(401).json({ error: 'Sign in required', code: 'AUTH_REQUIRED' });
    return;
  }

  if (req.method !== 'PUT') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { phoneNumber, nickname } = req.body as {
      phoneNumber?: string;
      nickname?: string;
    };
    if (!phoneNumber?.trim() || !nickname?.trim()) {
      res.status(400).json({ error: 'phoneNumber and nickname are required' });
      return;
    }
    const updated = await updatePhoneNumberNickname(phoneNumber.trim(), nickname.trim());
    res.status(200).json({ phoneNumber: updated });
  } catch (error) {
    console.error('PUT /api/phone-numbers/nickname:', error);
    res.status(503).json({
      error: error instanceof Error ? error.message : 'Failed to update nickname',
      code: 'READER_API_ERROR',
    });
  }
}
