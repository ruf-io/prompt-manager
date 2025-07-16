
import { db } from '../db';
import { promptTemplatesTable, usersTable } from '../db/schema';
import { type CreatePromptTemplateInput, type PromptTemplate } from '../schema';
import { eq } from 'drizzle-orm';

export const createPromptTemplate = async (input: CreatePromptTemplateInput): Promise<PromptTemplate> => {
  try {
    // Verify user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    // Insert prompt template record
    const result = await db.insert(promptTemplatesTable)
      .values({
        name: input.name,
        template_content: input.template_content,
        openai_model: input.openai_model,
        trigger_type: input.trigger_type,
        schedule: input.schedule,
        webhook_url: input.webhook_url,
        destination_webhook_url: input.destination_webhook_url,
        user_id: input.user_id
      })
      .returning()
      .execute();

    // Cast the database result to match our expected PromptTemplate type
    const template = result[0];
    return {
      ...template,
      schedule: template.schedule as PromptTemplate['schedule']
    };
  } catch (error) {
    console.error('Prompt template creation failed:', error);
    throw error;
  }
};
