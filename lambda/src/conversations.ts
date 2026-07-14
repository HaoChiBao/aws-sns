/** Helpers for conversation threading between a pool number and a remote contact. */

export type MessageDirection = 'inbound' | 'outbound';

export function conversationKey(poolNumber: string, remoteNumber: string): string {
  return `${poolNumber}#${remoteNumber}`;
}

export function parseConversationKey(key: string): {
  poolNumber: string;
  remoteNumber: string;
} | null {
  const idx = key.indexOf('#');
  if (idx <= 0 || idx === key.length - 1) return null;
  return {
    poolNumber: key.slice(0, idx),
    remoteNumber: key.slice(idx + 1),
  };
}

export function normalizeStoredMessage(item: Record<string, unknown>): {
  messageId: string;
  fromNumber: string;
  toNumber: string;
  messageBody: string;
  receivedAt: string;
  direction: MessageDirection;
  conversationKey: string;
  poolNumber: string;
  remoteNumber: string;
} {
  const fromNumber = String(item.fromNumber ?? '');
  const toNumber = String(item.toNumber ?? '');
  const direction =
    item.direction === 'outbound' ? ('outbound' as const) : ('inbound' as const);

  const poolNumber =
    typeof item.poolNumber === 'string' && item.poolNumber
      ? item.poolNumber
      : direction === 'outbound'
        ? fromNumber
        : toNumber;
  const remoteNumber =
    typeof item.remoteNumber === 'string' && item.remoteNumber
      ? item.remoteNumber
      : direction === 'outbound'
        ? toNumber
        : fromNumber;

  const key =
    typeof item.conversationKey === 'string' && item.conversationKey
      ? item.conversationKey
      : conversationKey(poolNumber, remoteNumber);

  return {
    messageId: String(item.messageId ?? ''),
    fromNumber,
    toNumber,
    messageBody: String(item.messageBody ?? ''),
    receivedAt: String(item.receivedAt ?? ''),
    direction,
    conversationKey: key,
    poolNumber,
    remoteNumber,
  };
}
