
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, promptTemplatesTable } from '../db/schema';
import { type ExecuteWebhookInput } from '../schema';
import { executeWebhook } from '../handlers/execute_webhook';
import { eq } from 'drizzle-orm';

// Store original fetch
const originalFetch = global.fetch;

// Mock response helpers
const createMockResponse = (data: any, ok: boolean = true, status: number = 200, statusText: string = 'OK') => ({
  ok,
  status,
  statusText,
  json: () => Promise.resolve(data)
}) as Response;

describe('executeWebhook', () => {
  let testUser: any;
  let testTemplate: any;

  beforeEach(async () => {
    await createDB();
    
    // Create test user
    const users = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword123'
      })
      .returning()
      .execute();
    
    testUser = users[0];

    // Create test webhook template
    const templates = await db.insert(promptTemplatesTable)
      .values({
        name: 'Test Webhook Template',
        template_content: 'Hello {{name}}, your message is: {{message}}',
        openai_model: 'gpt-3.5-turbo',
        trigger_type: 'webhook',
        schedule: null,
        webhook_url: null,
        destination_webhook_url: 'https://example.com/webhook',
        user_id: testUser.id
      })
      .returning()
      .execute();
    
    testTemplate = templates[0];

    // Setup default successful mocks
    global.fetch = ((url: string | URL | Request, options?: any) => {
      const urlString = typeof url === 'string' ? url : url.toString();
      
      if (urlString === 'https://api.openai.com/v1/chat/completions') {
        return Promise.resolve(createMockResponse({
          choices: [
            {
              message: {
                content: 'AI generated response for testing'
              }
            }
          ]
        }));
      }
      
      if (urlString === 'https://example.com/webhook') {
        return Promise.resolve(createMockResponse({
          status: 'received',
          message: 'Webhook processed successfully'
        }));
      }
      
      return Promise.resolve(createMockResponse({}, false, 404, 'Not Found'));
    }) as typeof fetch;
  });

  afterEach(async () => {
    await resetDB();
    global.fetch = originalFetch;
  });

  it('should execute webhook successfully with template rendering', async () => {
    const input: ExecuteWebhookInput = {
      template_id: testTemplate.id,
      payload: {
        name: 'John',
        message: 'Test message'
      }
    };

    const result = await executeWebhook(input);

    expect(result.success).toBe(true);
    expect(result.response).toBeDefined();
    expect(result.response.ai_response).toBe('AI generated response for testing');
    expect(result.response.rendered_prompt).toBe('Hello John, your message is: Test message');
    expect(result.response.webhook_response).toEqual({
      status: 'received',
      message: 'Webhook processed successfully'
    });
  });

  it('should handle template not found', async () => {
    const input: ExecuteWebhookInput = {
      template_id: 99999,
      payload: {
        name: 'John'
      }
    };

    const result = await executeWebhook(input);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Prompt template not found');
  });

  it('should reject non-webhook templates', async () => {
    // Create a scheduled template
    const scheduledTemplates = await db.insert(promptTemplatesTable)
      .values({
        name: 'Scheduled Template',
        template_content: 'Scheduled prompt',
        openai_model: 'gpt-3.5-turbo',
        trigger_type: 'scheduled',
        schedule: { frequency: 'daily' },
        webhook_url: null,
        destination_webhook_url: 'https://example.com/webhook',
        user_id: testUser.id
      })
      .returning()
      .execute();

    const input: ExecuteWebhookInput = {
      template_id: scheduledTemplates[0].id,
      payload: {
        name: 'John'
      }
    };

    const result = await executeWebhook(input);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Template is not configured for webhook triggers');
  });

  it('should handle OpenAI API errors', async () => {
    // Mock OpenAI API to return error
    global.fetch = ((url: string | URL | Request, options?: any) => {
      const urlString = typeof url === 'string' ? url : url.toString();
      
      if (urlString === 'https://api.openai.com/v1/chat/completions') {
        return Promise.resolve(createMockResponse({
          error: {
            message: 'API key invalid'
          }
        }, false, 401, 'Unauthorized'));
      }
      
      return Promise.resolve(createMockResponse({}));
    }) as typeof fetch;

    const input: ExecuteWebhookInput = {
      template_id: testTemplate.id,
      payload: {
        name: 'John',
        message: 'Test'
      }
    };

    const result = await executeWebhook(input);

    expect(result.success).toBe(false);
    expect(result.error).toBe('OpenAI API error: API key invalid');
  });

  it('should handle empty OpenAI response', async () => {
    // Mock OpenAI API to return empty response
    global.fetch = ((url: string | URL | Request, options?: any) => {
      const urlString = typeof url === 'string' ? url : url.toString();
      
      if (urlString === 'https://api.openai.com/v1/chat/completions') {
        return Promise.resolve(createMockResponse({
          choices: []
        }));
      }
      
      return Promise.resolve(createMockResponse({}));
    }) as typeof fetch;

    const input: ExecuteWebhookInput = {
      template_id: testTemplate.id,
      payload: {
        name: 'John',
        message: 'Test'
      }
    };

    const result = await executeWebhook(input);

    expect(result.success).toBe(false);
    expect(result.error).toBe('No response generated from OpenAI');
  });

  it('should handle webhook delivery failures', async () => {
    // Mock webhook endpoint to fail
    global.fetch = ((url: string | URL | Request, options?: any) => {
      const urlString = typeof url === 'string' ? url : url.toString();
      
      if (urlString === 'https://api.openai.com/v1/chat/completions') {
        return Promise.resolve(createMockResponse({
          choices: [
            {
              message: {
                content: 'AI response'
              }
            }
          ]
        }));
      }
      
      if (urlString === 'https://example.com/webhook') {
        return Promise.resolve(createMockResponse({}, false, 500, 'Internal Server Error'));
      }
      
      return Promise.resolve(createMockResponse({}));
    }) as typeof fetch;

    const input: ExecuteWebhookInput = {
      template_id: testTemplate.id,
      payload: {
        name: 'John',
        message: 'Test'
      }
    };

    const result = await executeWebhook(input);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Webhook delivery failed: 500 Internal Server Error');
  });

  it('should handle template rendering with multiple variables', async () => {
    // Create template with multiple variables
    const complexTemplates = await db.insert(promptTemplatesTable)
      .values({
        name: 'Complex Template',
        template_content: 'User {{user}} from {{location}} asked: {{question}} on {{date}}',
        openai_model: 'gpt-4',
        trigger_type: 'webhook',
        schedule: null,
        webhook_url: null,
        destination_webhook_url: 'https://example.com/webhook',
        user_id: testUser.id
      })
      .returning()
      .execute();

    const input: ExecuteWebhookInput = {
      template_id: complexTemplates[0].id,
      payload: {
        user: 'Alice',
        location: 'New York',
        question: 'How does AI work?',
        date: '2023-12-01'
      }
    };

    const result = await executeWebhook(input);

    expect(result.success).toBe(true);
    expect(result.response.rendered_prompt).toBe('User Alice from New York asked: How does AI work? on 2023-12-01');
  });

  it('should handle empty payload gracefully', async () => {
    const input: ExecuteWebhookInput = {
      template_id: testTemplate.id,
      payload: {}
    };

    const result = await executeWebhook(input);

    expect(result.success).toBe(true);
    expect(result.response.rendered_prompt).toBe('Hello {{name}}, your message is: {{message}}');
  });

  it('should handle template with spaces in variable names', async () => {
    // Create template with spaced variables
    const spacedTemplates = await db.insert(promptTemplatesTable)
      .values({
        name: 'Spaced Template',
        template_content: 'Hello {{ name }}, your message is: {{ message }}',
        openai_model: 'gpt-3.5-turbo',
        trigger_type: 'webhook',
        schedule: null,
        webhook_url: null,
        destination_webhook_url: 'https://example.com/webhook',
        user_id: testUser.id
      })
      .returning()
      .execute();

    const input: ExecuteWebhookInput = {
      template_id: spacedTemplates[0].id,
      payload: {
        name: 'John',
        message: 'Test message'
      }
    };

    const result = await executeWebhook(input);

    expect(result.success).toBe(true);
    expect(result.response.rendered_prompt).toBe('Hello John, your message is: Test message');
  });

  it('should handle network errors gracefully', async () => {
    // Mock fetch to throw network error
    global.fetch = ((url: string | URL | Request, options?: any) => {
      return Promise.reject(new Error('Network error'));
    }) as typeof fetch;

    const input: ExecuteWebhookInput = {
      template_id: testTemplate.id,
      payload: {
        name: 'John',
        message: 'Test'
      }
    };

    const result = await executeWebhook(input);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network error');
  });

  it('should verify template exists in database after creation', async () => {
    // Verify our test template exists
    const templates = await db.select()
      .from(promptTemplatesTable)
      .where(eq(promptTemplatesTable.id, testTemplate.id))
      .execute();

    expect(templates).toHaveLength(1);
    expect(templates[0].trigger_type).toBe('webhook');
    expect(templates[0].template_content).toBe('Hello {{name}}, your message is: {{message}}');
  });
});
