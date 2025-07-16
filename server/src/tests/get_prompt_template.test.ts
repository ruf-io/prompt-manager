
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, promptTemplatesTable } from '../db/schema';
import { type GetPromptTemplateInput } from '../schema';
import { getPromptTemplate } from '../handlers/get_prompt_template';

describe('getPromptTemplate', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return a prompt template by id', async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword123'
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create a test prompt template
    const templateResult = await db.insert(promptTemplatesTable)
      .values({
        name: 'Test Template',
        template_content: 'Hello {{name}}!',
        openai_model: 'gpt-3.5-turbo',
        trigger_type: 'webhook',
        schedule: null,
        webhook_url: 'https://example.com/webhook',
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

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(template.id);
    expect(result!.name).toEqual('Test Template');
    expect(result!.template_content).toEqual('Hello {{name}}!');
    expect(result!.openai_model).toEqual('gpt-3.5-turbo');
    expect(result!.trigger_type).toEqual('webhook');
    expect(result!.schedule).toBeNull();
    expect(result!.webhook_url).toEqual('https://example.com/webhook');
    expect(result!.destination_webhook_url).toEqual('https://example.com/destination');
    expect(result!.user_id).toEqual(user.id);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when template does not exist', async () => {
    const input: GetPromptTemplateInput = {
      id: 999999
    };

    const result = await getPromptTemplate(input);

    expect(result).toBeNull();
  });

  it('should return template with schedule when present', async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword123'
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create a scheduled prompt template
    const scheduleData = { frequency: 'daily' as const };
    const templateResult = await db.insert(promptTemplatesTable)
      .values({
        name: 'Scheduled Template',
        template_content: 'Daily reminder: {{message}}',
        openai_model: 'gpt-4',
        trigger_type: 'scheduled',
        schedule: scheduleData,
        webhook_url: null,
        destination_webhook_url: 'https://example.com/scheduled',
        user_id: user.id
      })
      .returning()
      .execute();

    const template = templateResult[0];

    const input: GetPromptTemplateInput = {
      id: template.id
    };

    const result = await getPromptTemplate(input);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(template.id);
    expect(result!.name).toEqual('Scheduled Template');
    expect(result!.trigger_type).toEqual('scheduled');
    expect(result!.schedule).toEqual(scheduleData);
    expect(result!.webhook_url).toBeNull();
    expect(result!.openai_model).toEqual('gpt-4');
  });
});
