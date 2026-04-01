import { z } from "zod";

const ownerSchema = z.object({
    login: z.string(),
    id: z.number(),
    avatar_url: z.string(),
    url: z.string(),
    html_url: z.string(),
});

const repositorySchema = z.object({
    githubGeneratedRepoId: z.number(),
    name: z.string(),
    full_name: z.string(),
    private: z.boolean(),
    owner: ownerSchema,
    html_url: z.string(),
    description: z.string().nullable(),
    url: z.string(),
    forks_url: z.string(),
    stargazers_url: z.string().nullable(),
    created_at: z.string(),
    svn_url: z.string(),
    homepage: z.string().nullable(),
    stargazers_count: z.number(),
    watchers_count: z.number(),
    forks_count: z.number(),
    allow_forking: z.boolean(),
});

const senderSchema = z.object({
    login: z.string(),
    id: z.number(),
    avatar_url: z.string(),
    url: z.string(),
    html_url: z.string(),
    followers_url: z.string(),
    following_url: z.string(),
    starred_url: z.string(),
    subscriptions_url: z.string(),
    organizations_url: z.string(),
    repos_url: z.string(),
    events_url: z.string(),
    received_events_url: z.string(),
    type: z.enum(["User", "Organization", "Enterprise"])
});

const installationSchema = z.object({
    id: z.number()
});

export const githubStarEventSchema = z.object({
  event: z.string(),
  data: z.object({
    action: z.enum(["created", "deleted"]),
    starred_at: z.string(),
    repository: repositorySchema,
    sender: senderSchema,
    installation: installationSchema
  })
});


export type githubStarEventSchemaDto = z.infer<typeof githubStarEventSchema>;
