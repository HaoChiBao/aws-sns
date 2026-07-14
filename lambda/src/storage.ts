import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { conversationKey } from './conversations.js';
import type { InboundSmsMessage } from './types.js';

let documentClient: DynamoDBDocumentClient | undefined;

function getDocumentClient(): DynamoDBDocumentClient {
  if (!documentClient) {
    documentClient = DynamoDBDocumentClient.from(
      new DynamoDBClient({
        region: process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION,
      }),
    );
  }
  return documentClient;
}

function getTableName(): string {
  const tableName = process.env.DYNAMODB_TABLE_NAME;
  if (!tableName) {
    throw new Error('DYNAMODB_TABLE_NAME environment variable is required');
  }
  return tableName;
}

export async function saveInboundSmsMessage(message: InboundSmsMessage): Promise<void> {
  if (process.env.LOCAL_DRY_RUN === 'true') {
    console.log('[dry-run] Skipping DynamoDB write:', JSON.stringify(message));
    return;
  }

  const poolNumber = message.poolNumber ?? message.toNumber;
  const remoteNumber = message.remoteNumber ?? message.fromNumber;
  const direction = message.direction ?? 'inbound';
  const key =
    message.conversationKey ?? conversationKey(poolNumber, remoteNumber);

  await getDocumentClient().send(
    new PutCommand({
      TableName: getTableName(),
      Item: {
        messageId: message.messageId,
        fromNumber: message.fromNumber,
        toNumber: message.toNumber,
        messageBody: message.messageBody,
        receivedAt: message.receivedAt,
        rawPayload: message.rawPayload,
        direction,
        conversationKey: key,
        poolNumber,
        remoteNumber,
      },
    }),
  );
}
