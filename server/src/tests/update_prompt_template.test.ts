
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

  it('should update a prompt template with all fields', async () => {
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
        name: 'Original Template',
        template_content: 'Original content',
        openai_model: 'gpt-3.5-turbo',
        trigger_type: 'scheduled',
        schedule: { frequency: 'daily' },
        webhook_url: null,
        destination_webhook_url: 'https://example.com/original',
        user_id: user.id
      })
      .returning()
      .execute();
    const template = templateResult[0];

    // Update the template
    const updateInput: UpdatePromptTemplateInput = {
      id: template.id,
      name: 'Updated Template',
      template_content: 'Updated content',
      openai_model: 'gpt-4',
      trigger_type: 'webhook',
      schedule: null,
      webhook_url: 'https://example.com/webhook',
      destination_webhook_url: 'https://example.com/updated'
    };

    const result = await updatePromptTemplate(updateInput);

    expect(result).toBeTruthy();
    expect(result!.id).toEqual(template.id);
    expect(result!.name).toEqual('Updated Template');
    expect(result!.template_content).toEqual('Updated content');
    expect(result!.openai_model).toEqual('gpt-4');
    expect(result!.trigger_type).toEqual('webhook');
    expect(result!.schedule).toBeNull();
    expect(result!.webhook_url).toEqual('https://example.com/webhook');
    expect(result!.destination_webhook_url).toEqual('https://example.com/updated');
    expect(result!.user_id).toEqual(user.id);
    expect(result!.updated_at).toBeInstanceOf(Date);
    expect(result!.updated_at.getTime()).toBeGreaterThan(template.updated_at.getTime());
  });

  it('should update only provided fields', async () => {
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
        name: 'Original Template',
        template_content: 'Original content',
        openai_model: 'gpt-3.5-turbo',
        trigger_type: 'scheduled',
        schedule: { frequency: 'daily' },
        webhook_url: null,
        destination_webhook_url: 'https://example.com/original',
        user_id: user.id
      })
      .returning()
      .execute();
    const template = templateResult[0];

    // Update only name and content
    const updateInput: UpdatePromptTemplateInput = {
      id: template.id,
      name: 'Updated Name Only',
      template_content: 'Updated content only'
    };

    const result = await updatePromptTemplate(updateInput);

    expect(result).toBeTruthy();
    expect(result!.id).toEqual(template.id);
    expect(result!.name).toEqual('Updated Name Only');
    expect(result!.template_content).toEqual('Updated content only');
    // These should remain unchanged
    expect(result!.openai_model).toEqual('gpt-3.5-turbo');
    expect(result!.trigger_type).toEqual('scheduled');
    expect(result!.schedule).toEqual({ frequency: 'daily' });
    expect(result!.webhook_url).toBeNull();
    expect(result!.destination_webhook_url).toEqual('https://example.com/original');
    expect(result!.user_id).toEqual(user.id);
    expect(result!.updated_at).toBeInstanceOf(Date);
    expect(result!.updated_at.getTime()).toBeGreaterThan(template.updated_at.getTime());
  });

  it('should save updated template to database', async () => {
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
        name: 'Original Template',
        template_content: 'Original content',
        openai_model: 'gpt-3.5-turbo',
        trigger_type: 'scheduled',
        schedule: { frequency: 'daily' },
        webhook_url: null,
        destination_webhook_url: 'https://example.com/original',
        user_id: user.id
      })
      .returning()
      .execute();
    const template = templateResult[0];

    // Update the template
    const updateInput: UpdatePromptTemplateInput = {
      id: template.id,
      name: 'Database Updated Template'
    };

    const result = await updatePromptTemplate(updateInput);

    // Verify the update was saved to database
    const templates = await db.select()
      .from(promptTemplatesTable)
      .where(eq(promptTemplatesTable.id, template.id))
      .execute();

    expect(templates).toHaveLength(1);
    expect(templates[0].name).toEqual('Database Updated Template');
    expect(templates[0].template_content).toEqual('Original content'); // Should remain unchanged
    expect(templates[0].updated_at).toBeInstanceOf(Date);
    expect(templates[0].updated_at.getTime()).toBeGreaterThan(template.updated_at.getTime());
  });

  it('should return null for non-existent template', async () => {
    const updateInput: UpdatePromptTemplateInput = {
      id: 999999, // Non-existent ID
      name: 'Updated Name'
    };

    const result = await updatePromptTemplate(updateInput);

    expect(result).toBeNull();
  });

  it('should handle schedule changes correctly', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword123'
      })
      .returning()
      .execute();
    const user = userResult[0];

    // Create a webhook template (schedule is null)
    const templateResult = await db.insert(promptTemplatesTable)
      .values({
        name: 'Webhook Template',
        template_content: 'Webhook content',
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

    // Update to scheduled with a schedule
    const updateInput: UpdatePromptTemplateInput = {
      id: template.id,
      trigger_type: 'scheduled',
      schedule: { frequency: 'weekly' },
      webhook_url: null
    };

    const result = await updatePromptTemplate(updateInput);

    expect(result).toBeTruthy();
    expect(result!.trigger_type).toEqual('scheduled');
    expect(result!.schedule).toEqual({ frequency: 'weekly' });
    expect(result!.webhook_url).toBeNull();
  });
});
