
import { db } from '../db';
import { promptTemplatesTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type Schedule } from '../schema';

export async function executeScheduledPrompts(frequency: Schedule['frequency']): Promise<{ executed: number; errors: string[] }> {
  const errors: string[] = [];
  let executed = 0;

  try {
    // Find all prompt templates with the specified frequency
    const templates = await db.select()
      .from(promptTemplatesTable)
      .where(eq(promptTemplatesTable.trigger_type, 'scheduled'))
      .execute();

    // Filter templates by frequency (schedule is stored as JSON)
    const scheduledTemplates = templates.filter(template => {
      if (!template.schedule) return false;
      const schedule = template.schedule as { frequency: string };
      return schedule.frequency === frequency;
    });

    // Execute each template
    for (const template of scheduledTemplates) {
      try {
        // Render the template content (for now, just use as-is since no dynamic context is specified)
        const renderedContent = template.template_content;

        // Call OpenAI API
        const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env['OPENAI_API_KEY']}`
          },
          body: JSON.stringify({
            model: template.openai_model,
            messages: [
              { role: 'user', content: renderedContent }
            ],
            max_tokens: 1000
          })
        });

        if (!openAIResponse.ok) {
          throw new Error(`OpenAI API error: ${openAIResponse.status} ${openAIResponse.statusText}`);
        }

        const openAIData = await openAIResponse.json() as {
          choices: Array<{
            message: {
              content: string;
            };
          }>;
        };
        const generatedContent = openAIData.choices[0]?.message?.content || '';

        // Send the response to the destination webhook
        const webhookResponse = await fetch(template.destination_webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            template_id: template.id,
            template_name: template.name,
            generated_content: generatedContent,
            executed_at: new Date().toISOString()
          })
        });

        if (!webhookResponse.ok) {
          throw new Error(`Webhook delivery error: ${webhookResponse.status} ${webhookResponse.statusText}`);
        }

        executed++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Template ${template.id} (${template.name}): ${errorMessage}`);
      }
    }

    return { executed, errors };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    errors.push(`Failed to fetch scheduled templates: ${errorMessage}`);
    return { executed, errors };
  }
}
