
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { promptTemplatesTable, usersTable } from '../db/schema';
import { type CreatePromptTemplateInput } from '../schema';
import { createPromptTemplate } from '../handlers/create_prompt_template';
import { eq } from 'drizzle-orm';

describe('createPromptTemplate', () => {
  let testUserId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword123'
      })
      .returning()
      .execute();
    
    testUserId = userResult[0].id;
  });

  afterEach(resetDB);

  it('should create a scheduled prompt template', async () => {
    const testInput: CreatePromptTemplateInput = {
      name: 'Daily Summary',
      template_content: 'Generate a daily summary of {{data}}',
      openai_model: 'gpt-4',
      trigger_type: 'scheduled',
      schedule: { frequency: 'daily' },
      webhook_url: null,
      destination_webhook_url: 'https://example.com/webhook',
      user_id: testUserId
    };

    const result = await createPromptTemplate(testInput);

    expect(result.name).toEqual('Daily Summary');
    expect(result.template_content).toEqual('Generate a daily summary of {{data}}');
    expect(result.openai_model).toEqual('gpt-4');
    expect(result.trigger_type).toEqual('scheduled');
    expect(result.schedule).toEqual({ frequency: 'daily' });
    expect(result.webhook_url).toBeNull();
    expect(result.destination_webhook_url).toEqual('https://example.com/webhook');
    expect(result.user_id).toEqual(testUserId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a webhook prompt template', async () => {
    const testInput: CreatePromptTemplateInput = {
      name: 'Webhook Handler',
      template_content: 'Process webhook payload: {{payload}}',
      openai_model: 'gpt-3.5-turbo',
      trigger_type: 'webhook',
      schedule: null,
      webhook_url: 'https://example.com/incoming',
      destination_webhook_url: 'https://example.com/outgoing',
      user_id: testUserId
    };

    const result = await createPromptTemplate(testInput);

    expect(result.name).toEqual('Webhook Handler');
    expect(result.template_content).toEqual('Process webhook payload: {{payload}}');
    expect(result.openai_model).toEqual('gpt-3.5-turbo');
    expect(result.trigger_type).toEqual('webhook');
    expect(result.schedule).toBeNull();
    expect(result.webhook_url).toEqual('https://example.com/incoming');
    expect(result.destination_webhook_url).toEqual('https://example.com/outgoing');
    expect(result.user_id).toEqual(testUserId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save prompt template to database', async () => {
    const testInput: CreatePromptTemplateInput = {
      name: 'Test Template',
      template_content: 'Test content',
      openai_model: 'gpt-4-turbo',
      trigger_type: 'scheduled',
      schedule: { frequency: 'weekly' },
      webhook_url: null,
      destination_webhook_url: 'https://example.com/webhook',
      user_id: testUserId
    };

    const result = await createPromptTemplate(testInput);

    const templates = await db.select()
      .from(promptTemplatesTable)
      .where(eq(promptTemplatesTable.id, result.id))
      .execute();

    expect(templates).toHaveLength(1);
    expect(templates[0].name).toEqual('Test Template');
    expect(templates[0].template_content).toEqual('Test content');
    expect(templates[0].openai_model).toEqual('gpt-4-turbo');
    expect(templates[0].trigger_type).toEqual('scheduled');
    expect(templates[0].schedule).toEqual({ frequency: 'weekly' });
    expect(templates[0].webhook_url).toBeNull();
    expect(templates[0].destination_webhook_url).toEqual('https://example.com/webhook');
    expect(templates[0].user_id).toEqual(testUserId);
    expect(templates[0].created_at).toBeInstanceOf(Date);
    expect(templates[0].updated_at).toBeInstanceOf(Date);
  });

  it('should use default openai_model when not specified', async () => {
    const testInput: CreatePromptTemplateInput = {
      name: 'Default Model Test',
      template_content: 'Test with default model',
      openai_model: 'gpt-3.5-turbo', // This is the default value
      trigger_type: 'scheduled',
      schedule: { frequency: 'hourly' },
      webhook_url: null,
      destination_webhook_url: 'https://example.com/webhook',
      user_id: testUserId
    };

    const result = await createPromptTemplate(testInput);

    expect(result.openai_model).toEqual('gpt-3.5-turbo');
  });

  it('should throw error when user does not exist', async () => {
    const testInput: CreatePromptTemplateInput = {
      name: 'Invalid User Template',
      template_content: 'Test content',
      openai_model: 'gpt-4',
      trigger_type: 'scheduled',
      schedule: { frequency: 'daily' },
      webhook_url: null,
      destination_webhook_url: 'https://example.com/webhook',
      user_id: 99999 // Non-existent user ID
    };

    await expect(createPromptTemplate(testInput)).rejects.toThrow(/user not found/i);
  });
});
