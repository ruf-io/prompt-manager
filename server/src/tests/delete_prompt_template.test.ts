
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, promptTemplatesTable } from '../db/schema';
import { type DeletePromptTemplateInput } from '../schema';
import { deletePromptTemplate } from '../handlers/delete_prompt_template';
import { eq } from 'drizzle-orm';

describe('deletePromptTemplate', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing prompt template', async () => {
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
        template_content: 'Hello {{name}}',
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

    const input: DeletePromptTemplateInput = {
      id: template.id
    };

    const result = await deletePromptTemplate(input);

    expect(result).toBe(true);

    // Verify the template was deleted from the database
    const templates = await db.select()
      .from(promptTemplatesTable)
      .where(eq(promptTemplatesTable.id, template.id))
      .execute();

    expect(templates).toHaveLength(0);
  });

  it('should return false when trying to delete non-existent template', async () => {
    const input: DeletePromptTemplateInput = {
      id: 999999 // Non-existent ID
    };

    const result = await deletePromptTemplate(input);

    expect(result).toBe(false);
  });

  it('should not affect other templates when deleting one', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword123'
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create two prompt templates
    const template1Result = await db.insert(promptTemplatesTable)
      .values({
        name: 'Template 1',
        template_content: 'Hello {{name}}',
        openai_model: 'gpt-3.5-turbo',
        trigger_type: 'webhook',
        schedule: null,
        webhook_url: 'https://example.com/webhook1',
        destination_webhook_url: 'https://example.com/destination1',
        user_id: user.id
      })
      .returning()
      .execute();

    const template2Result = await db.insert(promptTemplatesTable)
      .values({
        name: 'Template 2',
        template_content: 'Goodbye {{name}}',
        openai_model: 'gpt-4',
        trigger_type: 'scheduled',
        schedule: { frequency: 'daily' },
        webhook_url: null,
        destination_webhook_url: 'https://example.com/destination2',
        user_id: user.id
      })
      .returning()
      .execute();

    const template1 = template1Result[0];
    const template2 = template2Result[0];

    // Delete the first template
    const input: DeletePromptTemplateInput = {
      id: template1.id
    };

    const result = await deletePromptTemplate(input);

    expect(result).toBe(true);

    // Verify first template was deleted
    const deletedTemplates = await db.select()
      .from(promptTemplatesTable)
      .where(eq(promptTemplatesTable.id, template1.id))
      .execute();

    expect(deletedTemplates).toHaveLength(0);

    // Verify second template still exists
    const remainingTemplates = await db.select()
      .from(promptTemplatesTable)
      .where(eq(promptTemplatesTable.id, template2.id))
      .execute();

    expect(remainingTemplates).toHaveLength(1);
    expect(remainingTemplates[0].name).toBe('Template 2');
  });
});
