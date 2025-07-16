
import { db } from '../db';
import { promptTemplatesTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type GetPromptTemplateInput, type PromptTemplate } from '../schema';

export const getPromptTemplate = async (input: GetPromptTemplateInput): Promise<PromptTemplate | null> => {
  try {
    const results = await db.select()
      .from(promptTemplatesTable)
      .where(eq(promptTemplatesTable.id, input.id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const template = results[0];
    return {
      id: template.id,
      name: template.name,
      template_content: template.template_content,
      openai_model: template.openai_model,
      trigger_type: template.trigger_type,
      schedule: template.schedule as { frequency: "hourly" | "daily" | "weekly" } | null,
      webhook_url: template.webhook_url,
      destination_webhook_url: template.destination_webhook_url,
      user_id: template.user_id,
      created_at: template.created_at,
      updated_at: template.updated_at
    };
  } catch (error) {
    console.error('Get prompt template failed:', error);
    throw error;
  }
};
