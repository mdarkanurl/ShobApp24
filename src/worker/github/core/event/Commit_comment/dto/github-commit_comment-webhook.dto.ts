import { z } from "zod";

// reuse from previous design
const userSchema = z.object({
  login: z.string(),
  id: z.number(),
  node_id: z.string(),
  avatar_url: z.string(),
  url: z.string(),
  html_url: z.string(),
  type: z.string(),
  site_admin: z.boolean(),
}).passthrough();

const reactionsSchema = z.object({
  total_count: z.number(),
  "+1": z.number(),
  "-1": z.number(),
  laugh: z.number(),
  hooray: z.number(),
  confused: z.number(),
  heart: z.number(),
  rocket: z.number(),
  eyes: z.number(),
}).passthrough();

const commentSchema = z.object({
  id: z.number(),
  node_id: z.string(),
  url: z.string(),
  html_url: z.string(),
  user: userSchema,

  body: z.string(),

  commit_id: z.string(),

  // nullable fields
  position: z.number().nullable(),
  line: z.number().nullable(),
  path: z.string().nullable(),

  created_at: z.string(),
  updated_at: z.string(),

  author_association: z.string(),

  reactions: reactionsSchema,
}).passthrough();

const repositorySchema = z.object({
  id: z.number(),
  name: z.string(),
  full_name: z.string(),
  private: z.boolean(),
  owner: userSchema,
  html_url: z.string(),
}).passthrough();

export const commitCommentEventSchema = z.object({
  action: z.enum(["created"]),
  comment: commentSchema,
  repository: repositorySchema,
  sender: userSchema,
  installation: z.object({
    id: z.number(),
    node_id: z.string(),
  }),
});

export type CommitCommentEventSchemaDto = z.infer<typeof commitCommentEventSchema>;

