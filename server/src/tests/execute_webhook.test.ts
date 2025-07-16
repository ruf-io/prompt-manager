
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, promptTemplatesTable } from '../db/schema';
import { type ExecuteWebhookInput } from '../schema';
import { executeWebhook } from '../handlers/execute_webhook';

// Mock user for testing
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashedpassword123'
};

// Mock prompt template for webhook triggers
const webhookTemplate = {
  name: 'Test Webhook Template',
  template_content: 'Hello {{name}}, your order {{order_id}} is {{status}}.',
  openai_model: 'gpt-3.5-turbo' as const,
  trigger_type: 'webhook' as const,
  schedule: null,
  webhook_url: null,
  destination_webhook_url: 'https://webhook.site/test-destination',
  user_id: 1
};

// Mock prompt template for scheduled triggers (should fail)
const scheduledTemplate = {
  name: 'Test Scheduled Template',
  template_content: 'This is a scheduled prompt.',
  openai_model: 'gpt-3.5-turbo' as const,
  trigger_type: 'scheduled' as const,
  schedule: { frequency: 'daily' as const },
  webhook_url: null,
  destination_webhook_url: 'https://webhook.site/test-destination',
  user_id: 1
};

// Test webhook payload
const testPayload = {
  name: 'John Doe',
  order_id: '12345',
  status: 'shipped'
};

describe('executeWebhook', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should fail when template not found', async () => {
    const input: ExecuteWebhookInput = {
      template_id: 999,
      payload: testPayload
    };

    const result = await executeWebhook(input);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Prompt template not found');
    expect(result.response).toBeUndefined();
  });

  it('should fail when template is not webhook-triggered', async () => {
    // Create user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create scheduled template
    const templateResult = await db.insert(promptTemplatesTable)
      .values({
        ...scheduledTemplate,
        user_id: userResult[0].id
      })
      .returning()
      .execute();

    const input: ExecuteWebhookInput = {
      template_id: templateResult[0].id,
      payload: testPayload
    };

    const result = await executeWebhook(input);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Template is not configured for webhook triggers');
    expect(result.response).toBeUndefined();
  });

  it('should handle template rendering and API calls', async () => {
    // Create user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create webhook template
    const templateResult = await db.insert(promptTemplatesTable)
      .values({
        ...webhookTemplate,
        user_id: userResult[0].id
      })
      .returning()
      .execute();

    const input: ExecuteWebhookInput = {
      template_id: templateResult[0].id,
      payload: testPayload
    };

    // Mock OpenAI API response
    const mockOpenAIResponse = {
      choices: [
        {
          message: {
            content: 'Thank you for your order update!'
          }
        }
      ]
    };

    // Mock fetch for OpenAI API - preserve original and extend with preconnect
    const originalFetch = global.fetch;
    const mockFetch = async (url: string | URL | Request, options?: RequestInit) => {
      if (typeof url === 'string' && url.includes('openai.com')) {
        return new Response(JSON.stringify(mockOpenAIResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Mock webhook destination response
      if (typeof url === 'string' && url.includes('webhook.site')) {
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response('Not found', { status: 404 });
    };

    // Add preconnect method to satisfy type requirements
    Object.assign(mockFetch, { preconnect: () => {} });
    global.fetch = mockFetch as any;

    const result = await executeWebhook(input);

    // Restore original fetch
    global.fetch = originalFetch;

    expect(result.success).toBe(true);
    expect(result.response?.ai_response).toBe('Thank you for your order update!');
    expect(result.response?.rendered_prompt).toBe('Hello John Doe, your order 12345 is shipped.');
    expect(result.response?.webhook_response).toEqual({ received: true });
  });

  it('should handle OpenAI API errors', async () => {
    // Create user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create webhook template
    const templateResult = await db.insert(promptTemplatesTable)
      .values({
        ...webhookTemplate,
        user_id: userResult[0].id
      })
      .returning()
      .execute();

    const input: ExecuteWebhookInput = {
      template_id: templateResult[0].id,
      payload: testPayload
    };

    // Mock OpenAI API error response
    const originalFetch = global.fetch;
    const mockFetch = async (url: string | URL | Request, options?: RequestInit) => {
      if (typeof url === 'string' && url.includes('openai.com')) {
        return new Response(JSON.stringify({
          error: {
            message: 'Invalid API key'
          }
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response('Not found', { status: 404 });
    };

    // Add preconnect method to satisfy type requirements
    Object.assign(mockFetch, { preconnect: () => {} });
    global.fetch = mockFetch as any;

    const result = await executeWebhook(input);

    // Restore original fetch
    global.fetch = originalFetch;

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/OpenAI API error: Invalid API key/);
  });

  it('should handle webhook delivery failures', async () => {
    // Create user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create webhook template
    const templateResult = await db.insert(promptTemplatesTable)
      .values({
        ...webhookTemplate,
        user_id: userResult[0].id
      })
      .returning()
      .execute();

    const input: ExecuteWebhookInput = {
      template_id: templateResult[0].id,
      payload: testPayload
    };

    // Mock OpenAI API success, webhook failure
    const originalFetch = global.fetch;
    const mockFetch = async (url: string | URL | Request, options?: RequestInit) => {
      if (typeof url === 'string' && url.includes('openai.com')) {
        return new Response(JSON.stringify({
          choices: [
            {
              message: {
                content: 'AI response content'
              }
            }
          ]
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Mock webhook destination failure
      if (typeof url === 'string' && url.includes('webhook.site')) {
        return new Response('Service unavailable', { status: 503 });
      }

      return new Response('Not found', { status: 404 });
    };

    // Add preconnect method to satisfy type requirements
    Object.assign(mockFetch, { preconnect: () => {} });
    global.fetch = mockFetch as any;

    const result = await executeWebhook(input);

    // Restore original fetch
    global.fetch = originalFetch;

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Webhook delivery failed: 503/);
  });

  it('should handle template with no placeholder variables', async () => {
    // Create user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create webhook template without placeholders
    const templateResult = await db.insert(promptTemplatesTable)
      .values({
        ...webhookTemplate,
        template_content: 'This is a static prompt without variables.',
        user_id: userResult[0].id
      })
      .returning()
      .execute();

    const input: ExecuteWebhookInput = {
      template_id: templateResult[0].id,
      payload: testPayload
    };

    // Mock successful responses
    const originalFetch = global.fetch;
    const mockFetch = async (url: string | URL | Request, options?: RequestInit) => {
      if (typeof url === 'string' && url.includes('openai.com')) {
        return new Response(JSON.stringify({
          choices: [
            {
              message: {
                content: 'Static response'
              }
            }
          ]
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      if (typeof url === 'string' && url.includes('webhook.site')) {
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response('Not found', { status: 404 });
    };

    // Add preconnect method to satisfy type requirements
    Object.assign(mockFetch, { preconnect: () => {} });
    global.fetch = mockFetch as any;

    const result = await executeWebhook(input);

    // Restore original fetch
    global.fetch = originalFetch;

    expect(result.success).toBe(true);
    expect(result.response?.rendered_prompt).toBe('This is a static prompt without variables.');
    expect(result.response?.ai_response).toBe('Static response');
  });
});
