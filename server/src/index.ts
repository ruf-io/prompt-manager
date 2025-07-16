
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import { 
  createUserInputSchema,
  loginUserInputSchema,
  createPromptTemplateInputSchema,
  updatePromptTemplateInputSchema,
  getPromptTemplatesByUserInputSchema,
  getPromptTemplateInputSchema,
  deletePromptTemplateInputSchema,
  executeWebhookInputSchema,
  frequencyEnum
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { loginUser } from './handlers/login_user';
import { createPromptTemplate } from './handlers/create_prompt_template';
import { getPromptTemplatesByUser } from './handlers/get_prompt_templates_by_user';
import { getPromptTemplate } from './handlers/get_prompt_template';
import { updatePromptTemplate } from './handlers/update_prompt_template';
import { deletePromptTemplate } from './handlers/delete_prompt_template';
import { executeWebhook } from './handlers/execute_webhook';
import { executeScheduledPrompts } from './handlers/execute_scheduled_prompts';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  loginUser: publicProcedure
    .input(loginUserInputSchema)
    .mutation(({ input }) => loginUser(input)),

  // Prompt template management
  createPromptTemplate: publicProcedure
    .input(createPromptTemplateInputSchema)
    .mutation(({ input }) => createPromptTemplate(input)),

  getPromptTemplatesByUser: publicProcedure
    .input(getPromptTemplatesByUserInputSchema)
    .query(({ input }) => getPromptTemplatesByUser(input)),

  getPromptTemplate: publicProcedure
    .input(getPromptTemplateInputSchema)
    .query(({ input }) => getPromptTemplate(input)),

  updatePromptTemplate: publicProcedure
    .input(updatePromptTemplateInputSchema)
    .mutation(({ input }) => updatePromptTemplate(input)),

  deletePromptTemplate: publicProcedure
    .input(deletePromptTemplateInputSchema)
    .mutation(({ input }) => deletePromptTemplate(input)),

  // Webhook execution
  executeWebhook: publicProcedure
    .input(executeWebhookInputSchema)
    .mutation(({ input }) => executeWebhook(input)),

  // Scheduled execution (typically called by cron job)
  executeScheduledPrompts: publicProcedure
    .input(frequencyEnum)
    .mutation(({ input }) => executeScheduledPrompts(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
