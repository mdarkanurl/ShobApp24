import { z } from "zod";

const userSchema = z.object({
  login: z.string(),
  id: z.number(),
  node_id: z.string(),
  avatar_url: z.string().url(),
  url: z.string().url(),
  html_url: z.string().url(),
  type: z.string(),
  site_admin: z.boolean(),
}).passthrough(); // important: GitHub may add fields

const licenseSchema = z.object({
  key: z.string(),
  name: z.string(),
  spdx_id: z.string(),
  url: z.string().url().nullable(),
  node_id: z.string(),
});

const repositorySchema = z.object({
  id: z.number(),
  node_id: z.string(),
  name: z.string(),
  full_name: z.string(),
  private: z.boolean(),
  owner: userSchema,
  html_url: z.string().url(),
  description: z.string().nullable(),
  fork: z.boolean(),
  url: z.string().url(),
  created_at: z.string(),
  updated_at: z.string(),
  pushed_at: z.string(),
  git_url: z.string(),
  ssh_url: z.string(),
  clone_url: z.string().url(),
  svn_url: z.string().url(),
  homepage: z.string().nullable(),
  size: z.number(),
  stargazers_count: z.number(),
  watchers_count: z.number(),
  language: z.string().nullable(),
  forks_count: z.number(),
  open_issues_count: z.number(),
  license: licenseSchema.nullable(),
  default_branch: z.string(),
  visibility: z.string(),
}).passthrough();

export const forkWebhookSchema = z.object({
  forkee: repositorySchema.extend({
    fork: z.literal(true),
  }),
  repository: repositorySchema.extend({
    fork: z.literal(false),
  }),
  sender: userSchema,
  installation: z.object({
    id: z.number(),
    node_id: z.string(),
  }),
});

export type ForkWebhookSchemaDto = z.infer<typeof forkWebhookSchema>;

