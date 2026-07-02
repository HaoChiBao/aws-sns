import {
  PinpointSMSVoiceV2Client,
  DescribePhoneNumbersCommand,
} from '@aws-sdk/client-pinpoint-sms-voice-v2';
import { countryCodeToName } from './regions.js';

export async function lookupPhoneNumberRegions(
  phoneNumbers: string[],
  region = process.env.AWS_REGION ?? 'us-east-2',
): Promise<Map<string, string>> {
  const wanted = new Set(phoneNumbers);
  const result = new Map<string, string>();
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
      const name = countryCodeToName(entry.IsoCountryCode);
      if (name) result.set(number, name);
    }

    nextToken = response.NextToken;
  } while (nextToken && result.size < wanted.size);

  return result;
}
