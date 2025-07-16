
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, promptTemplatesTable } from '../db/schema';
import { executeScheduledPrompts } from '../handlers/execute_scheduled_prompts';
import { eq } from 'drizzle-orm';

// Mock fetch globally
const originalFetch = global.fetch;
let fetchCalls: Array<{
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
}> = [];

const mockFetch = (url: string, options: any = {}) => {
  fetchCalls.push({
    url,
    method: options.method || 'GET',
    headers: options.headers || {},
    body: options.body || ''
  });

  // Mock OpenAI API response
  if (url.includes('openai.com')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        choices: [{
          message: {
            content: 'Generated AI response'
          }
        }]
      })
    } as Response);
  }

  // Mock webhook response
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({})
  } as Response);
};

describe('executeScheduledPrompts', () => {
  beforeEach(async () => {
    await createDB();
    fetchCalls = [];
    global.fetch = mockFetch as any;
  });

  afterEach(async () => {
    await resetDB();
    global.fetch = originalFetch;
  });

  it('should execute scheduled prompts with matching frequency', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create scheduled prompt template with daily frequency
    await db.insert(promptTemplatesTable)
      .values({
        name: 'Daily Report',
        template_content: 'Generate a daily report about sales',
        openai_model: 'gpt-3.5-turbo',
        trigger_type: 'scheduled',
        schedule: { frequency: 'daily' },
        webhook_url: null,
        destination_webhook_url: 'https://example.com/webhook',
        user_id: userId
      })
      .execute();

    // Execute daily scheduled prompts
    const result = await executeScheduledPrompts('daily');

    expect(result.executed).toBe(1);
    expect(result.errors).toHaveLength(0);

    // Verify OpenAI API was called
    const openAICalls = fetchCalls.filter(call => call.url.includes('openai.com'));
    expect(openAICalls).toHaveLength(1);
    expect(openAICalls[0].method).toBe('POST');
    expect(openAICalls[0].headers['Authorization']).toBe('Bearer undefined'); // No API key in test
    
    const openAIBody = JSON.parse(openAICalls[0].body);
    expect(openAIBody.model).toBe('gpt-3.5-turbo');
    expect(openAIBody.messages[0].content).toBe('Generate a daily report about sales');

    // Verify webhook was called
    const webhookCalls = fetchCalls.filter(call => call.url === 'https://example.com/webhook');
    expect(webhookCalls).toHaveLength(1);
    expect(webhookCalls[0].method).toBe('POST');
    
    const webhookBody = JSON.parse(webhookCalls[0].body);
    expect(webhookBody.template_name).toBe('Daily Report');
    expect(webhookBody.generated_content).toBe('Generated AI response');
    expect(webhookBody.executed_at).toBeDefined();
  });

  it('should not execute prompts with different frequency', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create scheduled prompt template with weekly frequency
    await db.insert(promptTemplatesTable)
      .values({
        name: 'Weekly Report',
        template_content: 'Generate a weekly report',
        openai_model: 'gpt-4',
        trigger_type: 'scheduled',
        schedule: { frequency: 'weekly' },
        webhook_url: null,
        destination_webhook_url: 'https://example.com/webhook',
        user_id: userId
      })
      .execute();

    // Execute daily scheduled prompts (should not match weekly template)
    const result = await executeScheduledPrompts('daily');

    expect(result.executed).toBe(0);
    expect(result.errors).toHaveLength(0);
    expect(fetchCalls).toHaveLength(0);
  });

  it('should not execute webhook-triggered prompts', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create webhook-triggered prompt template
    await db.insert(promptTemplatesTable)
      .values({
        name: 'Webhook Prompt',
        template_content: 'Process webhook data',
        openai_model: 'gpt-3.5-turbo',
        trigger_type: 'webhook',
        schedule: null,
        webhook_url: 'https://example.com/trigger',
        destination_webhook_url: 'https://example.com/webhook',
        user_id: userId
      })
      .execute();

    // Execute daily scheduled prompts (should not match webhook template)
    const result = await executeScheduledPrompts('daily');

    expect(result.executed).toBe(0);
    expect(result.errors).toHaveLength(0);
    expect(fetchCalls).toHaveLength(0);
  });

  it('should handle OpenAI API errors', async () => {
    // Mock fetch to return error for OpenAI
    global.fetch = ((url: string, options: any = {}) => {
      fetchCalls.push({
        url,
        method: options.method || 'GET',
        headers: options.headers || {},
        body: options.body || ''
      });

      if (url.includes('openai.com')) {
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        } as Response);
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      } as Response);
    }) as any;

    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create scheduled prompt template
    await db.insert(promptTemplatesTable)
      .values({
        name: 'Test Template',
        template_content: 'Test content',
        openai_model: 'gpt-3.5-turbo',
        trigger_type: 'scheduled',
        schedule: { frequency: 'daily' },
        webhook_url: null,
        destination_webhook_url: 'https://example.com/webhook',
        user_id: userId
      })
      .execute();

    // Execute scheduled prompts
    const result = await executeScheduledPrompts('daily');

    expect(result.executed).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/OpenAI API error: 500/);
  });

  it('should handle webhook delivery errors', async () => {
    // Mock fetch to return error for webhook but success for OpenAI
    global.fetch = ((url: string, options: any = {}) => {
      fetchCalls.push({
        url,
        method: options.method || 'GET',
        headers: options.headers || {},
        body: options.body || ''
      });

      if (url.includes('openai.com')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{
              message: {
                content: 'Generated AI response'
              }
            }]
          })
        } as Response);
      }

      // Webhook error
      return Promise.resolve({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      } as Response);
    }) as any;

    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create scheduled prompt template
    await db.insert(promptTemplatesTable)
      .values({
        name: 'Test Template',
        template_content: 'Test content',
        openai_model: 'gpt-3.5-turbo',
        trigger_type: 'scheduled',
        schedule: { frequency: 'daily' },
        webhook_url: null,
        destination_webhook_url: 'https://example.com/webhook',
        user_id: userId
      })
      .execute();

    // Execute scheduled prompts
    const result = await executeScheduledPrompts('daily');

    expect(result.executed).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/Webhook delivery error: 404/);
  });

  it('should execute multiple scheduled prompts', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create multiple scheduled prompt templates
    await db.insert(promptTemplatesTable)
      .values([
        {
          name: 'Daily Report 1',
          template_content: 'Generate first daily report',
          openai_model: 'gpt-3.5-turbo',
          trigger_type: 'scheduled',
          schedule: { frequency: 'daily' },
          webhook_url: null,
          destination_webhook_url: 'https://example.com/webhook1',
          user_id: userId
        },
        {
          name: 'Daily Report 2',
          template_content: 'Generate second daily report',
          openai_model: 'gpt-4',
          trigger_type: 'scheduled',
          schedule: { frequency: 'daily' },
          webhook_url: null,
          destination_webhook_url: 'https://example.com/webhook2',
          user_id: userId
        }
      ])
      .execute();

    // Execute daily scheduled prompts
    const result = await executeScheduledPrompts('daily');

    expect(result.executed).toBe(2);
    expect(result.errors).toHaveLength(0);

    // Verify both OpenAI calls were made
    const openAICalls = fetchCalls.filter(call => call.url.includes('openai.com'));
    expect(openAICalls).toHaveLength(2);

    // Verify both webhook calls were made
    const webhook1Calls = fetchCalls.filter(call => call.url === 'https://example.com/webhook1');
    const webhook2Calls = fetchCalls.filter(call => call.url === 'https://example.com/webhook2');
    expect(webhook1Calls).toHaveLength(1);
    expect(webhook2Calls).toHaveLength(1);
  });
});
