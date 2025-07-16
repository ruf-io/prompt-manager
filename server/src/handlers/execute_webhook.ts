
import { db } from '../db';
import { promptTemplatesTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type ExecuteWebhookInput } from '../schema';

export async function executeWebhook(input: ExecuteWebhookInput): Promise<{ success: boolean; response?: any; error?: string }> {
  try {
    // Find the prompt template by ID
    const templates = await db.select()
      .from(promptTemplatesTable)
      .where(eq(promptTemplatesTable.id, input.template_id))
      .execute();

    if (templates.length === 0) {
      return {
        success: false,
        error: 'Prompt template not found'
      };
    }

    const template = templates[0];

    // Verify this is a webhook-triggered template
    if (template.trigger_type !== 'webhook') {
      return {
        success: false,
        error: 'Template is not configured for webhook triggers'
      };
    }

    // Simple template rendering with string replacement
    // Replace {{key}} patterns with values from payload
    let renderedPrompt = template.template_content;
    for (const [key, value] of Object.entries(input.payload)) {
      const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      renderedPrompt = renderedPrompt.replace(pattern, String(value));
    }

    // Call OpenAI API with the rendered prompt
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env['OPENAI_API_KEY']}`
      },
      body: JSON.stringify({
        model: template.openai_model,
        messages: [
          {
            role: 'user',
            content: renderedPrompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json() as any;
      return {
        success: false,
        error: `OpenAI API error: ${errorData.error?.message || 'Unknown error'}`
      };
    }

    const openaiData = await openaiResponse.json() as any;
    const aiResponse = openaiData.choices[0]?.message?.content;

    if (!aiResponse) {
      return {
        success: false,
        error: 'No response generated from OpenAI'
      };
    }

    // Send the AI response to the destination webhook URL
    const webhookResponse = await fetch(template.destination_webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        template_id: input.template_id,
        original_payload: input.payload,
        rendered_prompt: renderedPrompt,
        ai_response: aiResponse,
        timestamp: new Date().toISOString()
      })
    });

    if (!webhookResponse.ok) {
      return {
        success: false,
        error: `Webhook delivery failed: ${webhookResponse.status} ${webhookResponse.statusText}`
      };
    }

    const webhookData = await webhookResponse.json();

    return {
      success: true,
      response: {
        ai_response: aiResponse,
        webhook_response: webhookData,
        rendered_prompt: renderedPrompt
      }
    };

  } catch (error) {
    console.error('Webhook execution failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
