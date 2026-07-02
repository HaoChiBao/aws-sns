import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
  loadPhoneNumbers,
  parseConfiguredPhoneNumbers,
  updateNickname,
} from './phone-numbers.js';

const region = process.env.AWS_REGION ?? 'us-east-2';
const messagesTableName = process.env.DYNAMODB_TABLE_NAME ?? 'InboundSmsMessages';
const nicknamesTableName =
  process.env.NICKNAMES_TABLE_NAME ?? 'InboundSmsNicknames';
const configuredPhoneNumbers = parseConfiguredPhoneNumbers(process.env.PHONE_NUMBERS);
const apiKey = process.env.READER_API_KEY;

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));

function corsHeaders() {
  return {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type,x-api-key',
    'access-control-allow-methods': 'GET,PUT,OPTIONS',
  };
}

function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: corsHeaders(),
    body: JSON.stringify(body),
  };
}

function authorize(event: { headers?: Record<string, string | undefined> }): boolean {
  if (!apiKey) return true;
  const provided =
    event.headers?.['x-api-key'] ??
    event.headers?.['X-Api-Key'] ??
    event.headers?.['X-API-Key'];
  return provided === apiKey;
}

function parseBody(event: { body?: string | null; isBase64Encoded?: boolean }): unknown {
  if (!event.body) return null;
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body;
  return JSON.parse(raw);
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const method = event.requestContext.http.method;

  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders() };
  }

  if (!authorize(event)) {
    return json(401, { error: 'Invalid API key' });
  }

  const path = event.rawPath ?? event.requestContext.http.path;

  try {
    if (path.endsWith('/phone-numbers') && method === 'GET') {
      const phoneNumbers = await loadPhoneNumbers(
        docClient,
        nicknamesTableName,
        configuredPhoneNumbers,
      );
      return json(200, { phoneNumbers });
    }

    if (path.endsWith('/phone-numbers/nickname') && method === 'PUT') {
      const body = parseBody(event) as { phoneNumber?: string; nickname?: string } | null;
      const phoneNumber = body?.phoneNumber?.trim();
      const nickname = body?.nickname?.trim();

      if (!phoneNumber || !nickname) {
        return json(400, { error: 'phoneNumber and nickname are required' });
      }

      try {
        const updated = await updateNickname(
          docClient,
          nicknamesTableName,
          phoneNumber,
          nickname,
          configuredPhoneNumbers,
        );

        if (!updated) {
          return json(404, { error: 'Phone number not in pool' });
        }

        return json(200, { phoneNumber: updated });
      } catch (error) {
        return json(400, {
          error: error instanceof Error ? error.message : 'Invalid nickname',
        });
      }
    }

    if (path.endsWith('/messages') && method === 'GET') {
      const result = await docClient.send(
        new ScanCommand({ TableName: messagesTableName, Limit: 200 }),
      );

      const messages = ((result.Items ?? []) as Record<string, string>[])
        .map((item) => ({
          messageId: item.messageId,
          fromNumber: item.fromNumber,
          toNumber: item.toNumber,
          messageBody: item.messageBody,
          receivedAt: item.receivedAt,
        }))
        .sort(
          (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
        );

      return json(200, { messages });
    }

    return json(404, { error: 'Not found' });
  } catch (error) {
    console.error('Reader API error:', error);
    return json(500, {
      error: error instanceof Error ? error.message : 'Failed to read data',
    });
  }
};
