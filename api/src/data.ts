export interface InboundMessage {
  messageId: string;
  fromNumber: string;
  toNumber: string;
  messageBody: string;
  receivedAt: string;
  direction?: 'inbound' | 'outbound';
  conversationKey?: string;
  poolNumber?: string;
  remoteNumber?: string;
}

export interface PhoneNumberEntry {
  phoneNumber: string;
  nickname: string;
  region: string;
  createdAt?: string;
}

function readerBaseUrl(): string {
  const url = process.env.READER_API_URL?.trim();
  if (!url) {
    throw new Error('READER_API_URL is not configured');
  }
  return url.replace(/\/$/, '');
}

function readerHeaders(): HeadersInit {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const key = process.env.READER_API_KEY?.trim();
  if (key) headers['x-api-key'] = key;
  return headers;
}

export async function listMessages(): Promise<InboundMessage[]> {
  const res = await fetch(`${readerBaseUrl()}/messages`, { headers: readerHeaders() });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Failed to load messages (${res.status})`);
  }
  const data = (await res.json()) as { messages: InboundMessage[] };
  return data.messages ?? [];
}

export async function listPhoneNumbers(): Promise<PhoneNumberEntry[]> {
  const res = await fetch(`${readerBaseUrl()}/phone-numbers`, { headers: readerHeaders() });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Failed to load phone numbers (${res.status})`);
  }
  const data = (await res.json()) as { phoneNumbers: PhoneNumberEntry[] };
  return data.phoneNumbers ?? [];
}

export async function updatePhoneNumberNickname(
  phoneNumber: string,
  nickname: string,
): Promise<PhoneNumberEntry> {
  const res = await fetch(`${readerBaseUrl()}/phone-numbers/nickname`, {
    method: 'PUT',
    headers: {
      ...readerHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ phoneNumber, nickname }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Failed to update nickname (${res.status})`);
  }
  const data = (await res.json()) as { phoneNumber: PhoneNumberEntry };
  return data.phoneNumber;
}

export async function sendMessage(input: {
  fromNumber: string;
  toNumber: string;
  messageBody: string;
}): Promise<InboundMessage> {
  const res = await fetch(`${readerBaseUrl()}/messages/send`, {
    method: 'POST',
    headers: {
      ...readerHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Failed to send message (${res.status})`);
  }
  const data = (await res.json()) as { message: InboundMessage };
  return data.message;
}
