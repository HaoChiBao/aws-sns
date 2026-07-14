import {
  PinpointSMSVoiceV2Client,
  DescribePhoneNumbersCommand,
} from '@aws-sdk/client-pinpoint-sms-voice-v2';
import { countryCodeToName } from './regions.js';

export interface PhoneNumberLookupInfo {
  region: string;
  createdAt?: string;
}

export async function lookupPhoneNumberInfo(
  phoneNumbers: string[],
  region = process.env.AWS_REGION ?? 'us-east-2',
): Promise<Map<string, PhoneNumberLookupInfo>> {
  const wanted = new Set(phoneNumbers);
  const result = new Map<string, PhoneNumberLookupInfo>();
  if (!wanted.size) return result;

  const client = new PinpointSMSVoiceV2Client({ region });
  let nextToken: string | undefined;

  do {
    const response = await client.send(
      new DescribePhoneNumbersCommand({
        NextToken: nextToken,
        MaxResults: 100,
      }),
    );

    for (const entry of response.PhoneNumbers ?? []) {
      const number = entry.PhoneNumber;
      if (!number || !wanted.has(number)) continue;

      const regionName = countryCodeToName(entry.IsoCountryCode);
      const createdAt =
        entry.CreatedTimestamp instanceof Date
          ? entry.CreatedTimestamp.toISOString()
          : entry.CreatedTimestamp
            ? new Date(entry.CreatedTimestamp).toISOString()
            : undefined;

      if (regionName || createdAt) {
        result.set(number, {
          region: regionName ?? 'Unknown',
          ...(createdAt ? { createdAt } : {}),
        });
      }
    }

    nextToken = response.NextToken;
  } while (nextToken && result.size < wanted.size);

  return result;
}

/** @deprecated Prefer lookupPhoneNumberInfo — kept for callers that only need region. */
export async function lookupPhoneNumberRegions(
  phoneNumbers: string[],
  region = process.env.AWS_REGION ?? 'us-east-2',
): Promise<Map<string, string>> {
  const info = await lookupPhoneNumberInfo(phoneNumbers, region);
  const result = new Map<string, string>();
  for (const [number, entry] of info) {
    if (entry.region) result.set(number, entry.region);
  }
  return result;
}
