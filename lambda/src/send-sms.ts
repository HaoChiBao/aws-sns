import { randomUUID } from 'node:crypto';
import {
  PinpointSMSVoiceV2Client,
  SendTextMessageCommand,
} from '@aws-sdk/client-pinpoint-sms-voice-v2';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { conversationKey } from './conversations.js';

export interface SendSmsInput {
  /** Pool / origination number (must be in configured pool). */
  fromNumber: string;
  /** Remote destination. */
  toNumber: string;
  messageBody: string;
}

export interface SentSmsMessage {
  messageId: string;
  fromNumber: string;
  toNumber: string;
  messageBody: string;
  receivedAt: string;
  direction: 'outbound';
  conversationKey: string;
  poolNumber: string;
  remoteNumber: string;
  awsMessageId?: string;
}

export async function sendSmsMessage(
  docClient: DynamoDBDocumentClient,
  tableName: string,
  input: SendSmsInput,
  region = process.env.AWS_REGION ?? 'us-east-2',
): Promise<SentSmsMessage> {
  const fromNumber = input.fromNumber.trim();
  const toNumber = input.toNumber.trim();
  const messageBody = input.messageBody.trim();

  if (!fromNumber || !toNumber || !messageBody) {
    throw new Error('fromNumber, toNumber, and messageBody are required');
  }
  if (messageBody.length > 1600) {
    throw new Error('messageBody must be 1600 characters or fewer');
  }

  const client = new PinpointSMSVoiceV2Client({ region });
  const response = await client.send(
    new SendTextMessageCommand({
      DestinationPhoneNumber: toNumber,
      OriginationIdentity: fromNumber,
      MessageBody: messageBody,
      MessageType: 'TRANSACTIONAL',
    }),
  );

  const receivedAt = new Date().toISOString();
  const messageId = response.MessageId?.trim() || randomUUID();
  const key = conversationKey(fromNumber, toNumber);

  const record: SentSmsMessage = {
    messageId,
    fromNumber,
    toNumber,
    messageBody,
    receivedAt,
    direction: 'outbound',
    conversationKey: key,
    poolNumber: fromNumber,
    remoteNumber: toNumber,
    awsMessageId: response.MessageId,
  };

  await docClient.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        messageId: record.messageId,
        fromNumber: record.fromNumber,
        toNumber: record.toNumber,
        messageBody: record.messageBody,
        receivedAt: record.receivedAt,
        direction: record.direction,
        conversationKey: record.conversationKey,
        poolNumber: record.poolNumber,
        remoteNumber: record.remoteNumber,
        awsMessageId: record.awsMessageId,
      },
    }),
  );

  return record;
}
