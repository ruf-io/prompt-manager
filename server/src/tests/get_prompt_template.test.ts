
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, promptTemplatesTable } from '../db/schema';
import { type GetPromptTemplateInput } from '../schema';
import { getPromptTemplate } from '../handlers/get_prompt_template';

describe('getPromptTemplate', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return a prompt template when found', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword123'
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create a prompt template
    const templateResult = await db.insert(promptTemplatesTable)
      .values({
        name: 'Test Template',
        template_content: 'Hello {{name}}!',
        openai_model: 'gpt-3.5-turbo',
        trigger_type: 'scheduled',
        schedule: { frequency: 'daily' },
        webhook_url: null,
        destination_webhook_url: 'https://example.com/webhook',
        user_id: user.id
      })
      .returning()
      .execute();

    const template = templateResult[0];

    const input: GetPromptTemplateInput = {
      id: template.id
    };

    const result = await getPromptTemplate(input);

    expect(result).toBeDefined();
    expect(result!.id).toEqual(template.id);
    expect(result!.name).toEqual('Test Template');
    expect(result!.template_content).toEqual('Hello {{name}}!');
    expect(result!.openai_model).toEqual('gpt-3.5-turbo');
    expect(result!.trigger_type).toEqual('scheduled');
    expect(result!.schedule).toEqual({ frequency: 'daily' });
    expect(result!.webhook_url).toBeNull();
    expect(result!.destination_webhook_url).toEqual('https://example.com/webhook');
    expect(result!.user_id).toEqual(user.id);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when prompt template not found', async () => {
    const input: GetPromptTemplateInput = {
      id: 999
    };

    const result = await getPromptTemplate(input);

    expect(result).toBeNull();
  });

  it('should handle webhook trigger type with webhook_url', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword123'
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create a webhook-triggered template
    const templateResult = await db.insert(promptTemplatesTable)
      .values({
        name: 'Webhook Template',
        template_content: 'Process {{data}}',
        openai_model: 'gpt-4',
        trigger_type: 'webhook',
        schedule: null,
        webhook_url: 'https://example.com/trigger',
        destination_webhook_url: 'https://example.com/destination',
        user_id: user.id
      })
      .returning()
      .execute();

    const template = templateResult[0];

    const input: GetPromptTemplateInput = {
      id: template.id
    };

    const result = await getPromptTemplate(input);

    expect(result).toBeDefined();
    expect(result!.trigger_type).toEqual('webhook');
    expect(result!.schedule).toBeNull();
    expect(result!.webhook_url).toEqual('https://example.com/trigger');
    expect(result!.openai_model).toEqual('gpt-4');
  });
});
