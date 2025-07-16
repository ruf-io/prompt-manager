
import { db } from '../db';
import { promptTemplatesTable } from '../db/schema';
import { type UpdatePromptTemplateInput, type PromptTemplate } from '../schema';
import { eq } from 'drizzle-orm';

export const updatePromptTemplate = async (input: UpdatePromptTemplateInput): Promise<PromptTemplate | null> => {
  try {
    // Build update object with only provided fields
    const updateData: any = {};
    
    if (input.name !== undefined) {
      updateData.name = input.name;
    }
    
    if (input.template_content !== undefined) {
      updateData.template_content = input.template_content;
    }
    
    if (input.openai_model !== undefined) {
      updateData.openai_model = input.openai_model;
    }
    
    if (input.trigger_type !== undefined) {
      updateData.trigger_type = input.trigger_type;
    }
    
    if (input.schedule !== undefined) {
      updateData.schedule = input.schedule;
    }
    
    if (input.webhook_url !== undefined) {
      updateData.webhook_url = input.webhook_url;
    }
    
    if (input.destination_webhook_url !== undefined) {
      updateData.destination_webhook_url = input.destination_webhook_url;
    }

    // Always update the updated_at timestamp
    updateData.updated_at = new Date();

    // Update the prompt template
    const result = await db.update(promptTemplatesTable)
      .set(updateData)
      .where(eq(promptTemplatesTable.id, input.id))
      .returning()
      .execute();

    // Return null if no template was found/updated
    if (!result[0]) {
      return null;
    }

    // Convert the database result to match the PromptTemplate type
    const template = result[0];
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
    console.error('Prompt template update failed:', error);
    throw error;
  }
};
