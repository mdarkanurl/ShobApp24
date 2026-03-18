import { z } from "zod";

const githubUserSchema = z.object({
  login: z.string(),
  id: z.number(),
  node_id: z.string(),
  avatar_url: z.string().url(),
  gravatar_id: z.string(),
  url: z.string().url(),
  html_url: z.string().url(),
  followers_url: z.string().url(),
  following_url: z.string(),
  gists_url: z.string(),
  starred_url: z.string(),
  subscriptions_url: z.string().url(),
  organizations_url: z.string().url(),
  repos_url: z.string().url(),
  events_url: z.string(),
  received_events_url: z.string().url(),
  type: z.enum(["User", "Organization", "Enterprise"]),
  user_view_type: z.string(),
  site_admin: z.boolean()
});

const repositorySchema = z.object({
  id: z.number(),
  node_id: z.string(),
  name: z.string(),
  full_name: z.string(),
  private: z.boolean()
});

const permissionsSchema = z.object({
  actions: z.string(),
  contents: z.string(),
  deployments: z.string(),
  discussions: z.string(),
  issues: z.string(),
  metadata: z.string(),
  pull_requests: z.string(),
  statuses: z.string()
});

const installationSchema = z.object({
  id: z.number(),
  client_id: z.string(),
  account: githubUserSchema,
  repository_selection: z.string(),
  access_tokens_url: z.string().url(),
  repositories_url: z.string().url(),
  html_url: z.string().url(),
  app_id: z.number(),
  app_slug: z.string(),
  target_id: z.number(),
  target_type: z.string(),
  permissions: permissionsSchema,
  events: z.array(z.string()),
  created_at: z.string(),
  updated_at: z.string(),
  single_file_name: z.string().nullable(),
  has_multiple_single_files: z.boolean(),
  single_file_paths: z.array(z.string()),
  suspended_by: z.any().nullable(),
  suspended_at: z.any().nullable()
});

export const githubInstallationEventSchema = z.object({
  event: z.string(),
  data: z.object({
    action: z.string(),
    installation: installationSchema,
    repositories: z.array(repositorySchema),
    requester: z.any().nullable(),
    sender: githubUserSchema
  })
});

export type githubInstallationEventSchemaDto = z.infer<typeof githubInstallationEventSchema>;