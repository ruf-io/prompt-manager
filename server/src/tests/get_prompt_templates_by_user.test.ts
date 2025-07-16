
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, promptTemplatesTable } from '../db/schema';
import { type GetPromptTemplatesByUserInput } from '../schema';
import { getPromptTemplatesByUser } from '../handlers/get_prompt_templates_by_user';

describe('getPromptTemplatesByUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array for user with no templates', async () => {
    // Create a user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();

    const user = userResult[0];

    const input: GetPromptTemplatesByUserInput = {
      user_id: user.id
    };

    const result = await getPromptTemplatesByUser(input);

    expect(result).toEqual([]);
  });

  it('should return all templates for a user', async () => {
    // Create a user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create multiple prompt templates for the user
    const template1 = await db.insert(promptTemplatesTable)
      .values({
        name: 'Template 1',
        template_content: 'Content 1',
        openai_model: 'gpt-3.5-turbo',
        trigger_type: 'scheduled',
        schedule: { frequency: 'daily' },
        webhook_url: null,
        destination_webhook_url: 'https://example.com/webhook1',
        user_id: user.id
      })
      .returning()
      .execute();

    const template2 = await db.insert(promptTemplatesTable)
      .values({
        name: 'Template 2',
        template_content: 'Content 2',
        openai_model: 'gpt-4',
        trigger_type: 'webhook',
        schedule: null,
        webhook_url: 'https://example.com/trigger',
        destination_webhook_url: 'https://example.com/webhook2',
        user_id: user.id
      })
      .returning()
      .execute();

    const input: GetPromptTemplatesByUserInput = {
      user_id: user.id
    };

    const result = await getPromptTemplatesByUser(input);

    expect(result).toHaveLength(2);
    
    // Check first template
    const resultTemplate1 = result.find(t => t.name === 'Template 1');
    expect(resultTemplate1).toBeDefined();
    expect(resultTemplate1?.id).toBe(template1[0].id);
    expect(resultTemplate1?.template_content).toBe('Content 1');
    expect(resultTemplate1?.openai_model).toBe('gpt-3.5-turbo');
    expect(resultTemplate1?.trigger_type).toBe('scheduled');
    expect(resultTemplate1?.schedule).toEqual({ frequency: 'daily' });
    expect(resultTemplate1?.webhook_url).toBeNull();
    expect(resultTemplate1?.destination_webhook_url).toBe('https://example.com/webhook1');
    expect(resultTemplate1?.user_id).toBe(user.id);
    expect(resultTemplate1?.created_at).toBeInstanceOf(Date);
    expect(resultTemplate1?.updated_at).toBeInstanceOf(Date);

    // Check second template
    const resultTemplate2 = result.find(t => t.name === 'Template 2');
    expect(resultTemplate2).toBeDefined();
    expect(resultTemplate2?.id).toBe(template2[0].id);
    expect(resultTemplate2?.template_content).toBe('Content 2');
    expect(resultTemplate2?.openai_model).toBe('gpt-4');
    expect(resultTemplate2?.trigger_type).toBe('webhook');
    expect(resultTemplate2?.schedule).toBeNull();
    expect(resultTemplate2?.webhook_url).toBe('https://example.com/trigger');
    expect(resultTemplate2?.destination_webhook_url).toBe('https://example.com/webhook2');
    expect(resultTemplate2?.user_id).toBe(user.id);
    expect(resultTemplate2?.created_at).toBeInstanceOf(Date);
    expect(resultTemplate2?.updated_at).toBeInstanceOf(Date);
  });

  it('should only return templates belonging to the specified user', async () => {
    // Create two users
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'hashedpassword1'
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashedpassword2'
      })
      .returning()
      .execute();

    const user1 = user1Result[0];
    const user2 = user2Result[0];

    // Create templates for both users
    await db.insert(promptTemplatesTable)
      .values({
        name: 'User 1 Template',
        template_content: 'Content 1',
        openai_model: 'gpt-3.5-turbo',
        trigger_type: 'scheduled',
        schedule: { frequency: 'daily' },
        webhook_url: null,
        destination_webhook_url: 'https://example.com/webhook1',
        user_id: user1.id
      })
      .execute();

    await db.insert(promptTemplatesTable)
      .values({
        name: 'User 2 Template',
        template_content: 'Content 2',
        openai_model: 'gpt-4',
        trigger_type: 'webhook',
        schedule: null,
        webhook_url: 'https://example.com/trigger',
        destination_webhook_url: 'https://example.com/webhook2',
        user_id: user2.id
      })
      .execute();

    const input: GetPromptTemplatesByUserInput = {
      user_id: user1.id
    };

    const result = await getPromptTemplatesByUser(input);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('User 1 Template');
    expect(result[0].user_id).toBe(user1.id);
  });

  it('should throw error for non-existent user', async () => {
    const input: GetPromptTemplatesByUserInput = {
      user_id: 999999
    };

    await expect(getPromptTemplatesByUser(input)).rejects.toThrow(/user not found/i);
  });
});
