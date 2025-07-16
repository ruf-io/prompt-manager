
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, promptTemplatesTable } from '../db/schema';
import { type UpdatePromptTemplateInput } from '../schema';
import { updatePromptTemplate } from '../handlers/update_prompt_template';
import { eq } from 'drizzle-orm';

describe('updatePromptTemplate', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;
  let templateId: number;

  beforeEach(async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword123'
      })
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create a test prompt template
    const templateResult = await db.insert(promptTemplatesTable)
      .values({
        name: 'Original Template',
        template_content: 'Original content',
        openai_model: 'gpt-3.5-turbo',
        trigger_type: 'scheduled',
        schedule: { frequency: 'daily' },
        webhook_url: null,
        destination_webhook_url: 'https://example.com/webhook',
        user_id: userId
      })
      .returning()
      .execute();
    templateId = templateResult[0].id;
  });

  it('should update a prompt template with all fields', async () => {
    const input: UpdatePromptTemplateInput = {
      id: templateId,
      name: 'Updated Template',
      template_content: 'Updated content',
      openai_model: 'gpt-4',
      trigger_type: 'webhook',
      schedule: null,
      webhook_url: 'https://example.com/trigger',
      destination_webhook_url: 'https://example.com/updated-webhook'
    };

    const result = await updatePromptTemplate(input);

    expect(result).toBeDefined();
    expect(result!.id).toEqual(templateId);
    expect(result!.name).toEqual('Updated Template');
    expect(result!.template_content).toEqual('Updated content');
    expect(result!.openai_model).toEqual('gpt-4');
    expect(result!.trigger_type).toEqual('webhook');
    expect(result!.schedule).toBeNull();
    expect(result!.webhook_url).toEqual('https://example.com/trigger');
    expect(result!.destination_webhook_url).toEqual('https://example.com/updated-webhook');
    expect(result!.user_id).toEqual(userId);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should update only specified fields', async () => {
    const input: UpdatePromptTemplateInput = {
      id: templateId,
      name: 'Partially Updated Template',
      openai_model: 'gpt-4-turbo'
    };

    const result = await updatePromptTemplate(input);

    expect(result).toBeDefined();
    expect(result!.name).toEqual('Partially Updated Template');
    expect(result!.openai_model).toEqual('gpt-4-turbo');
    // Other fields should remain unchanged
    expect(result!.template_content).toEqual('Original content');
    expect(result!.trigger_type).toEqual('scheduled');
    expect(result!.schedule).toEqual({ frequency: 'daily' });
    expect(result!.webhook_url).toBeNull();
    expect(result!.destination_webhook_url).toEqual('https://example.com/webhook');
  });

  it('should update schedule from object to null', async () => {
    const input: UpdatePromptTemplateInput = {
      id: templateId,
      schedule: null
    };

    const result = await updatePromptTemplate(input);

    expect(result).toBeDefined();
    expect(result!.schedule).toBeNull();
  });

  it('should update schedule from null to object', async () => {
    // First set schedule to null
    await db.update(promptTemplatesTable)
      .set({ schedule: null })
      .where(eq(promptTemplatesTable.id, templateId))
      .execute();

    const input: UpdatePromptTemplateInput = {
      id: templateId,
      schedule: { frequency: 'weekly' }
    };

    const result = await updatePromptTemplate(input);

    expect(result).toBeDefined();
    expect(result!.schedule).toEqual({ frequency: 'weekly' });
  });

  it('should save changes to database', async () => {
    const input: UpdatePromptTemplateInput = {
      id: templateId,
      name: 'Database Test Template',
      template_content: 'Database test content'
    };

    await updatePromptTemplate(input);

    // Query database to verify changes
    const templates = await db.select()
      .from(promptTemplatesTable)
      .where(eq(promptTemplatesTable.id, templateId))
      .execute();

    expect(templates).toHaveLength(1);
    expect(templates[0].name).toEqual('Database Test Template');
    expect(templates[0].template_content).toEqual('Database test content');
  });

  it('should return null for non-existent template', async () => {
    const input: UpdatePromptTemplateInput = {
      id: 99999,
      name: 'Non-existent Template'
    };

    const result = await updatePromptTemplate(input);

    expect(result).toBeNull();
  });

  it('should update the updated_at timestamp', async () => {
    // Get original timestamp
    const originalTemplate = await db.select()
      .from(promptTemplatesTable)
      .where(eq(promptTemplatesTable.id, templateId))
      .execute();

    const originalUpdatedAt = originalTemplate[0].updated_at;

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: UpdatePromptTemplateInput = {
      id: templateId,
      name: 'Timestamp Test Template'
    };

    const result = await updatePromptTemplate(input);

    expect(result).toBeDefined();
    expect(result!.updated_at).toBeInstanceOf(Date);
    expect(result!.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });
});
