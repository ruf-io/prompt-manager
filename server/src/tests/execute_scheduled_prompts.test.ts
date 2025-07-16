
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, promptTemplatesTable } from '../db/schema';
import { executeScheduledPrompts } from '../handlers/execute_scheduled_prompts';

describe('executeScheduledPrompts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return zero executed when no scheduled templates exist', async () => {
    const result = await executeScheduledPrompts('daily');

    expect(result.executed).toEqual(0);
    expect(result.errors).toEqual([]);
  });

  it('should return zero executed when no templates match frequency', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create a scheduled template with different frequency
    await db.insert(promptTemplatesTable)
      .values({
        name: 'Test Template',
        template_content: 'Test prompt content',
        openai_model: 'gpt-3.5-turbo',
        trigger_type: 'scheduled',
        schedule: { frequency: 'weekly' },
        webhook_url: null,
        destination_webhook_url: 'https://example.com/webhook',
        user_id: user.id
      })
      .execute();

    const result = await executeScheduledPrompts('daily');

    expect(result.executed).toEqual(0);
    expect(result.errors).toEqual([]);
  });

  it('should ignore webhook-triggered templates', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create a webhook-triggered template
    await db.insert(promptTemplatesTable)
      .values({
        name: 'Webhook Template',
        template_content: 'Webhook prompt content',
        openai_model: 'gpt-3.5-turbo',
        trigger_type: 'webhook',
        schedule: null,
        webhook_url: 'https://example.com/trigger',
        destination_webhook_url: 'https://example.com/webhook',
        user_id: user.id
      })
      .execute();

    const result = await executeScheduledPrompts('daily');

    expect(result.executed).toEqual(0);
    expect(result.errors).toEqual([]);
  });

  it('should ignore templates with null schedule', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create a scheduled template with null schedule
    await db.insert(promptTemplatesTable)
      .values({
        name: 'No Schedule Template',
        template_content: 'No schedule prompt content',
        openai_model: 'gpt-3.5-turbo',
        trigger_type: 'scheduled',
        schedule: null,
        webhook_url: null,
        destination_webhook_url: 'https://example.com/webhook',
        user_id: user.id
      })
      .execute();

    const result = await executeScheduledPrompts('daily');

    expect(result.executed).toEqual(0);
    expect(result.errors).toEqual([]);
  });

  it('should handle errors gracefully when API calls fail', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create a scheduled template
    await db.insert(promptTemplatesTable)
      .values({
        name: 'Test Template',
        template_content: 'Test prompt content',
        openai_model: 'gpt-3.5-turbo',
        trigger_type: 'scheduled',
        schedule: { frequency: 'daily' },
        webhook_url: null,
        destination_webhook_url: 'https://example.com/webhook',
        user_id: user.id
      })
      .execute();

    const result = await executeScheduledPrompts('daily');

    // Since we can't make real API calls in tests, we expect errors
    expect(result.executed).toEqual(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/Template \d+ \(Test Template\):/);
  });

  it('should process multiple templates with same frequency', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create multiple scheduled templates with same frequency
    await db.insert(promptTemplatesTable)
      .values([
        {
          name: 'Template 1',
          template_content: 'First prompt content',
          openai_model: 'gpt-3.5-turbo',
          trigger_type: 'scheduled',
          schedule: { frequency: 'daily' },
          webhook_url: null,
          destination_webhook_url: 'https://example.com/webhook1',
          user_id: user.id
        },
        {
          name: 'Template 2',
          template_content: 'Second prompt content',
          openai_model: 'gpt-4',
          trigger_type: 'scheduled',
          schedule: { frequency: 'daily' },
          webhook_url: null,
          destination_webhook_url: 'https://example.com/webhook2',
          user_id: user.id
        }
      ])
      .execute();

    const result = await executeScheduledPrompts('daily');

    // Since we can't make real API calls in tests, we expect errors
    expect(result.executed).toEqual(0);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0]).toMatch(/Template \d+ \(Template [12]\):/);
    expect(result.errors[1]).toMatch(/Template \d+ \(Template [12]\):/);
  });
});
