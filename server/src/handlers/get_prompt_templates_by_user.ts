
import { db } from '../db';
import { promptTemplatesTable, usersTable } from '../db/schema';
import { type GetPromptTemplatesByUserInput, type PromptTemplate } from '../schema';
import { eq } from 'drizzle-orm';

export const getPromptTemplatesByUser = async (input: GetPromptTemplatesByUserInput): Promise<PromptTemplate[]> => {
  try {
    // First verify the user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    // Query all prompt templates for the user
    const templates = await db.select()
      .from(promptTemplatesTable)
      .where(eq(promptTemplatesTable.user_id, input.user_id))
      .execute();

    // Map database results to schema type with proper type casting for JSON fields
    return templates.map(template => ({
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
    }));
  } catch (error) {
    console.error('Failed to get prompt templates by user:', error);
    throw error;
  }
};
