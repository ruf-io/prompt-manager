
import { db } from '../db';
import { promptTemplatesTable } from '../db/schema';
import { type DeletePromptTemplateInput } from '../schema';
import { eq } from 'drizzle-orm';

export const deletePromptTemplate = async (input: DeletePromptTemplateInput): Promise<boolean> => {
  try {
    // Delete the prompt template by ID
    const result = await db.delete(promptTemplatesTable)
      .where(eq(promptTemplatesTable.id, input.id))
      .returning()
      .execute();

    // Return true if a record was deleted, false otherwise
    return result.length > 0;
  } catch (error) {
    console.error('Prompt template deletion failed:', error);
    throw error;
  }
};
