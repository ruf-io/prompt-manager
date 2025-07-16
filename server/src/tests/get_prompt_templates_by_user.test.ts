
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, promptTemplatesTable } from '../db/schema';
import { type GetPromptTemplatesByUserInput, type CreateUserInput } from '../schema';
import { getPromptTemplatesByUser } from '../handlers/get_prompt_templates_by_user';
import { eq } from 'drizzle-orm';

describe('getPromptTemplatesByUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get all prompt templates for a user', async () => {
    // Create test user
    const testUser = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword123'
      })
      .returning()
      .execute();

    const userId = testUser[0].id;

    // Create test prompt templates
    const template1 = await db.insert(promptTemplatesTable)
      .values({
        name: 'Template 1',
        template_content: 'Test template content 1',
        openai_model: 'gpt-4',
        trigger_type: 'scheduled',
        schedule: { frequency: 'daily' },
        webhook_url: null,
        destination_webhook_url: 'https://example.com/webhook1',
        user_id: userId
      })
      .returning()
      .execute();

    const template2 = await db.insert(promptTemplatesTable)
      .values({
        name: 'Template 2',
        template_content: 'Test template content 2',
        openai_model: 'gpt-3.5-turbo',
        trigger_type: 'webhook',
        schedule: null,
        webhook_url: 'https://example.com/trigger',
        destination_webhook_url: 'https://example.com/webhook2',
        user_id: userId
      })
      .returning()
      .execute();

    const input: GetPromptTemplatesByUserInput = {
      user_id: userId
    };

    const result = await getPromptTemplatesByUser(input);

    expect(result).toHaveLength(2);
    
    // Check first template
    const firstTemplate = result.find(t => t.name === 'Template 1');
    expect(firstTemplate).toBeDefined();
    expect(firstTemplate!.template_content).toEqual('Test template content 1');
    expect(firstTemplate!.openai_model).toEqual('gpt-4');
    expect(firstTemplate!.trigger_type).toEqual('scheduled');
    expect(firstTemplate!.schedule).toEqual({ frequency: 'daily' });
    expect(firstTemplate!.webhook_url).toBeNull();
    expect(firstTemplate!.destination_webhook_url).toEqual('https://example.com/webhook1');
    expect(firstTemplate!.user_id).toEqual(userId);
    expect(firstTemplate!.created_at).toBeInstanceOf(Date);
    expect(firstTemplate!.updated_at).toBeInstanceOf(Date);

    // Check second template
    const secondTemplate = result.find(t => t.name === 'Template 2');
    expect(secondTemplate).toBeDefined();
    expect(secondTemplate!.template_content).toEqual('Test template content 2');
    expect(secondTemplate!.openai_model).toEqual('gpt-3.5-turbo');
    expect(secondTemplate!.trigger_type).toEqual('webhook');
    expect(secondTemplate!.schedule).toBeNull();
    expect(secondTemplate!.webhook_url).toEqual('https://example.com/trigger');
    expect(secondTemplate!.destination_webhook_url).toEqual('https://example.com/webhook2');
    expect(secondTemplate!.user_id).toEqual(userId);
  });

  it('should return empty array when user has no templates', async () => {
    // Create test user
    const testUser = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword123'
      })
      .returning()
      .execute();

    const input: GetPromptTemplatesByUserInput = {
      user_id: testUser[0].id
    };

    const result = await getPromptTemplatesByUser(input);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should throw error when user does not exist', async () => {
    const input: GetPromptTemplatesByUserInput = {
      user_id: 999999 // Non-existent user ID
    };

    await expect(getPromptTemplatesByUser(input)).rejects.toThrow(/user not found/i);
  });

  it('should only return templates for the specified user', async () => {
    // Create two test users
    const user1 = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'hashedpassword123'
      })
      .returning()
      .execute();

    const user2 = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashedpassword123'
      })
      .returning()
      .execute();

    // Create templates for both users
    await db.insert(promptTemplatesTable)
      .values({
        name: 'User 1 Template',
        template_content: 'User 1 content',
        openai_model: 'gpt-4',
        trigger_type: 'scheduled',
        schedule: { frequency: 'daily' },
        webhook_url: null,
        destination_webhook_url: 'https://example.com/webhook1',
        user_id: user1[0].id
      })
      .execute();

    await db.insert(promptTemplatesTable)
      .values({
        name: 'User 2 Template',
        template_content: 'User 2 content',
        openai_model: 'gpt-3.5-turbo',
        trigger_type: 'webhook',
        schedule: null,
        webhook_url: 'https://example.com/trigger',
        destination_webhook_url: 'https://example.com/webhook2',
        user_id: user2[0].id
      })
      .execute();

    const input: GetPromptTemplatesByUserInput = {
      user_id: user1[0].id
    };

    const result = await getPromptTemplatesByUser(input);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('User 1 Template');
    expect(result[0].user_id).toEqual(user1[0].id);
  });

  it('should handle different schedule configurations correctly', async () => {
    // Create test user
    const testUser = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword123'
      })
      .returning()
      .execute();

    const userId = testUser[0].id;

    // Create templates with different schedule configurations
    await db.insert(promptTemplatesTable)
      .values({
        name: 'Hourly Template',
        template_content: 'Hourly content',
        openai_model: 'gpt-4',
        trigger_type: 'scheduled',
        schedule: { frequency: 'hourly' },
        webhook_url: null,
        destination_webhook_url: 'https://example.com/webhook1',
        user_id: userId
      })
      .execute();

    await db.insert(promptTemplatesTable)
      .values({
        name: 'Weekly Template',
        template_content: 'Weekly content',
        openai_model: 'gpt-4',
        trigger_type: 'scheduled',
        schedule: { frequency: 'weekly' },
        webhook_url: null,
        destination_webhook_url: 'https://example.com/webhook2',
        user_id: userId
      })
      .execute();

    const input: GetPromptTemplatesByUserInput = {
      user_id: userId
    };

    const result = await getPromptTemplatesByUser(input);

    expect(result).toHaveLength(2);
    
    const hourlyTemplate = result.find(t => t.name === 'Hourly Template');
    expect(hourlyTemplate!.schedule).toEqual({ frequency: 'hourly' });
    
    const weeklyTemplate = result.find(t => t.name === 'Weekly Template');
    expect(weeklyTemplate!.schedule).toEqual({ frequency: 'weekly' });
  });
});
