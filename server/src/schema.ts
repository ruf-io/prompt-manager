
import { z } from 'zod';

// Enums
export const triggerTypeEnum = z.enum(['scheduled', 'webhook']);
export const frequencyEnum = z.enum(['hourly', 'daily', 'weekly']);
export const openAIModelEnum = z.enum([
  'gpt-4',
  'gpt-4-turbo',
  'gpt-3.5-turbo',
  'gpt-3.5-turbo-16k'
]);

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Schedule schema for scheduled prompts
export const scheduleSchema = z.object({
  frequency: frequencyEnum
});

export type Schedule = z.infer<typeof scheduleSchema>;

// Prompt template schema
export const promptTemplateSchema = z.object({
  id: z.number(),
  name: z.string(),
  template_content: z.string(),
  openai_model: openAIModelEnum,
  trigger_type: triggerTypeEnum,
  schedule: scheduleSchema.nullable(),
  webhook_url: z.string().url().nullable(),
  destination_webhook_url: z.string().url(),
  user_id: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type PromptTemplate = z.infer<typeof promptTemplateSchema>;

// Input schemas for user operations
export const createUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const loginUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginUserInput = z.infer<typeof loginUserInputSchema>;

// Input schemas for prompt template operations
export const createPromptTemplateInputSchema = z.object({
  name: z.string().min(1),
  template_content: z.string().min(1),
  openai_model: openAIModelEnum.default('gpt-3.5-turbo'),
  trigger_type: triggerTypeEnum,
  schedule: scheduleSchema.nullable(),
  webhook_url: z.string().url().nullable(),
  destination_webhook_url: z.string().url(),
  user_id: z.number()
});

export type CreatePromptTemplateInput = z.infer<typeof createPromptTemplateInputSchema>;

export const updatePromptTemplateInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  template_content: z.string().min(1).optional(),
  openai_model: openAIModelEnum.optional(),
  trigger_type: triggerTypeEnum.optional(),
  schedule: scheduleSchema.nullable().optional(),
  webhook_url: z.string().url().nullable().optional(),
  destination_webhook_url: z.string().url().optional()
});

export type UpdatePromptTemplateInput = z.infer<typeof updatePromptTemplateInputSchema>;

export const getPromptTemplatesByUserInputSchema = z.object({
  user_id: z.number()
});

export type GetPromptTemplatesByUserInput = z.infer<typeof getPromptTemplatesByUserInputSchema>;

export const getPromptTemplateInputSchema = z.object({
  id: z.number()
});

export type GetPromptTemplateInput = z.infer<typeof getPromptTemplateInputSchema>;

export const deletePromptTemplateInputSchema = z.object({
  id: z.number()
});

export type DeletePromptTemplateInput = z.infer<typeof deletePromptTemplateInputSchema>;

// Webhook execution schema
export const executeWebhookInputSchema = z.object({
  template_id: z.number(),
  payload: z.record(z.any()) // JSON payload from webhook
});

export type ExecuteWebhookInput = z.infer<typeof executeWebhookInputSchema>;

// Authentication response schema
export const authResponseSchema = z.object({
  user: userSchema,
  token: z.string().optional()
});

export type AuthResponse = z.infer<typeof authResponseSchema>;
