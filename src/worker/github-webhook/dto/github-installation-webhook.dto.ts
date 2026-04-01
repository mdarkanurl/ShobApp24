import { z } from "zod";

const githubUserSchema = z.object({
  login: z.string(),
  id: z.number(),
  avatar_url: z.string().url(),
  url: z.string().url(),
  html_url: z.string().url(),
  repos_url: z.string().url(),
  type: z.enum(["User", "Organization", "Enterprise"]),
});

const repositorySchema = z.object({
  id: z.number(),
  name: z.string(),
  full_name: z.string(),
  private: z.boolean()
});

const installationSchema = z.object({
  id: z.number(),
  account: githubUserSchema
});

export const githubInstallationEventSchema = z.object({
  userId: z.string(),
  event: z.string(),
  data: z.object({
    action: z.string(),
    installation: installationSchema,
    repositories: z.array(repositorySchema)
  })
});

export type githubInstallationEventSchemaDto = z.infer<typeof githubInstallationEventSchema>;