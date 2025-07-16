
import { serial, text, pgTable, timestamp, integer, json, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const triggerTypeEnum = pgEnum('trigger_type', ['scheduled', 'webhook']);
export const frequencyEnum = pgEnum('frequency', ['hourly', 'daily', 'weekly']);
export const openAIModelEnum = pgEnum('openai_model', [
  'gpt-4',
  'gpt-4-turbo', 
  'gpt-3.5-turbo',
  'gpt-3.5-turbo-16k'
]);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Prompt templates table
export const promptTemplatesTable = pgTable('prompt_templates', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  template_content: text('template_content').notNull(),
  openai_model: openAIModelEnum('openai_model').notNull().default('gpt-3.5-turbo'),
  trigger_type: triggerTypeEnum('trigger_type').notNull(),
  schedule: json('schedule'), // Nullable JSON object for schedule configuration
  webhook_url: text('webhook_url'), // Nullable URL for webhook trigger
  destination_webhook_url: text('destination_webhook_url').notNull(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  promptTemplates: many(promptTemplatesTable)
}));

export const promptTemplatesRelations = relations(promptTemplatesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [promptTemplatesTable.user_id],
    references: [usersTable.id]
  })
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type PromptTemplate = typeof promptTemplatesTable.$inferSelect;
export type NewPromptTemplate = typeof promptTemplatesTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = { 
  users: usersTable, 
  promptTemplates: promptTemplatesTable 
};
