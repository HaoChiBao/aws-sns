import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isAuthenticated } from '../../src/auth-vercel.js';
import { sendMessage } from '../../src/data.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isAuthenticated(req)) {
    res.status(401).json({ error: 'Sign in required', code: 'AUTH_REQUIRED' });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { fromNumber, toNumber, messageBody } = req.body as {
      fromNumber?: string;
      toNumber?: string;
      messageBody?: string;
    };
    if (!fromNumber?.trim() || !toNumber?.trim() || !messageBody?.trim()) {
      res.status(400).json({
        error: 'fromNumber, toNumber, and messageBody are required',
      });
      return;
    }
    const message = await sendMessage({
      fromNumber: fromNumber.trim(),
      toNumber: toNumber.trim(),
      messageBody: messageBody.trim(),
    });
    res.status(200).json({ message });
  } catch (error) {
    console.error('POST /api/messages/send:', error);
    res.status(502).json({
      error: error instanceof Error ? error.message : 'Failed to send message',
      code: 'READER_API_ERROR',
    });
  }
}
