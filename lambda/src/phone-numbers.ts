import {
  BatchGetCommand,
  DynamoDBDocumentClient,
  PutCommand,
} from '@aws-sdk/lib-dynamodb';
import { generateDefaultNickname } from './nicknames.js';
import { lookupPhoneNumberRegions } from './phone-number-lookup.js';

export interface PhoneNumberRecord {
  phoneNumber: string;
  nickname: string;
  region: string;
}

interface PhoneRecordItem {
  phoneNumber: string;
  nickname: string;
  region?: string;
  updatedAt?: string;
}

export function parseConfiguredPhoneNumbers(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean);
}

export async function loadPhoneNumbers(
  docClient: DynamoDBDocumentClient,
  nicknamesTableName: string,
  configuredNumbers: string[],
): Promise<PhoneNumberRecord[]> {
  const stored = await getStoredRecords(docClient, nicknamesTableName, configuredNumbers);
  const missingRegions = configuredNumbers.filter((n) => !stored.get(n)?.region);

  let awsRegions = new Map<string, string>();
  if (missingRegions.length) {
    try {
      awsRegions = await lookupPhoneNumberRegions(missingRegions);
    } catch (error) {
      console.error('Failed to look up phone number regions:', error);
    }
  }

  const records: PhoneNumberRecord[] = [];

  for (const phoneNumber of configuredNumbers) {
    const existing = stored.get(phoneNumber);
    const nickname = existing?.nickname ?? generateDefaultNickname(phoneNumber);
    const region = existing?.region ?? awsRegions.get(phoneNumber) ?? 'Unknown';

    if (!existing?.nickname || !existing?.region || existing.region !== region) {
      await saveRecord(docClient, nicknamesTableName, {
        phoneNumber,
        nickname,
        region,
      });
    }

    records.push({ phoneNumber, nickname, region });
  }

  return records;
}

export async function updateNickname(
  docClient: DynamoDBDocumentClient,
  nicknamesTableName: string,
  phoneNumber: string,
  nickname: string,
  allowedNumbers: string[],
): Promise<PhoneNumberRecord | null> {
  if (!allowedNumbers.includes(phoneNumber)) {
    return null;
  }

  const trimmed = nickname.trim();
  if (!trimmed || trimmed.length > 64) {
    throw new Error('Nickname must be 1–64 characters');
  }

  const stored = await getStoredRecords(docClient, nicknamesTableName, [phoneNumber]);
  const existing = stored.get(phoneNumber);
  const region = existing?.region ?? 'Unknown';

  await saveRecord(docClient, nicknamesTableName, {
    phoneNumber,
    nickname: trimmed,
    region,
  });

  return { phoneNumber, nickname: trimmed, region };
}

async function getStoredRecords(
  docClient: DynamoDBDocumentClient,
  tableName: string,
  phoneNumbers: string[],
): Promise<Map<string, PhoneRecordItem>> {
  const result = new Map<string, PhoneRecordItem>();
  if (!phoneNumbers.length) return result;

  const response = await docClient.send(
    new BatchGetCommand({
      RequestItems: {
        [tableName]: {
          Keys: phoneNumbers.map((phoneNumber) => ({ phoneNumber })),
        },
      },
    }),
  );

  const items = (response.Responses?.[tableName] ?? []) as PhoneRecordItem[];
  for (const item of items) {
    if (item.phoneNumber && item.nickname) {
      result.set(item.phoneNumber, item);
    }
  }

  return result;
}

async function saveRecord(
  docClient: DynamoDBDocumentClient,
  tableName: string,
  item: PhoneRecordItem,
): Promise<void> {
  await docClient.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        ...item,
        updatedAt: new Date().toISOString(),
      },
    }),
  );
}
