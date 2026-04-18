import { z } from "zod";

const githubUserSchema = z
  .object({
    login: z.string(),
    id: z.number(),
    node_id: z.string().optional(),
    avatar_url: z.string().url().optional(),
    gravatar_id: z.string().optional(),
    url: z.string().url().optional(),
    html_url: z.string().url().optional(),
    followers_url: z.string().url().optional(),
    following_url: z.string().optional(),
    gists_url: z.string().optional(),
    starred_url: z.string().optional(),
    subscriptions_url: z.string().url().optional(),
    organizations_url: z.string().url().optional(),
    repos_url: z.string().url().optional(),
    events_url: z.string().optional(),
    received_events_url: z.string().url().optional(),
    type: z.string().optional(),
    site_admin: z.boolean().optional(),
    deleted: z.boolean().optional(),
    name: z.string().optional(),
    email: z.string().email().optional(),
  })
  .passthrough();

const githubInstallationSchema = z
  .object({
    id: z.number(),
    node_id: z.string().optional(),
  })
  .passthrough();

const githubEnterpriseSchema = z
  .object({
    id: z.number(),
    node_id: z.string(),
    name: z.string(),
    slug: z.string(),
    avatar_url: z.string().url(),
    description: z.string().nullable(),
    html_url: z.string().url(),
    website_url: z.string().url().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .passthrough();

const githubOrganizationSchema = z
  .object({
    id: z.number(),
    node_id: z.string(),
    login: z.string(),
    url: z.string().url(),
    repos_url: z.string().url().optional(),
    events_url: z.string().url().optional(),
    hooks_url: z.string().url().optional(),
    issues_url: z.string().url().optional(),
    members_url: z.string().optional(),
    public_members_url: z.string().optional(),
    avatar_url: z.string().url().optional(),
    description: z.string().nullable().optional(),
  })
  .passthrough();

const githubRepositorySchema = z
  .object({
    id: z.number(),
    node_id: z.string().optional(),
    name: z.string(),
    full_name: z.string().optional(),
    private: z.boolean().optional(),
    owner: githubUserSchema.optional(),
    url: z.string().url().optional(),
    html_url: z.string().url().optional(),
  })
  .passthrough();

const githubWorkflowSchema = z
  .object({
    id: z.number(),
    node_id: z.string(),
    name: z.string(),
    path: z.string(),
    state: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    deleted_at: z.string().nullable().optional(),
    url: z.string().url(),
    html_url: z.string().url(),
    badge_url: z.string().url().optional(),
  })
  .passthrough();

const workflowRunCommitUserSchema = z
  .object({
    name: z.string(),
    email: z.string().email(),
    date: z.string(),
    username: z.string().optional(),
  })
  .passthrough();

const workflowRunHeadCommitSchema = z
  .object({
    id: z.string(),
    tree_id: z.string(),
    message: z.string(),
    timestamp: z.string(),
    author: workflowRunCommitUserSchema,
    committer: workflowRunCommitUserSchema,
  })
  .passthrough();

const workflowRunPullRequestRepoSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    url: z.string().url(),
  })
  .passthrough();

const workflowRunPullRequestSchema = z
  .object({
    id: z.number(),
    number: z.number(),
    url: z.string().url(),
    head: z.object({
      ref: z.string(),
      sha: z.string(),
      repo: workflowRunPullRequestRepoSchema,
    }),
    base: z.object({
      ref: z.string(),
      sha: z.string(),
      repo: workflowRunPullRequestRepoSchema,
    }),
  })
  .passthrough();

const referencedWorkflowSchema = z
  .object({
    path: z.string(),
    ref: z.string(),
    sha: z.string(),
  })
  .passthrough();

const githubWorkflowRunSchema = z
  .object({
    id: z.number(),
    node_id: z.string(),
    name: z.string().nullable().optional(),
    path: z.string(),
    event: z.string(),
    status: z.string(),
    conclusion: z.string().nullable(),
    workflow_id: z.number(),
    url: z.string().url(),
    html_url: z.string().url(),
    created_at: z.string(),
    updated_at: z.string(),
    run_attempt: z.number().optional(),
    run_number: z.number(),
    run_started_at: z.string(),
    jobs_url: z.string().url(),
    logs_url: z.string().url(),
    artifacts_url: z.string().url(),
    cancel_url: z.string().url(),
    rerun_url: z.string().url(),
    workflow_url: z.string().url(),
    previous_attempt_url: z.string().url().nullable().optional(),
    check_suite_id: z.number(),
    check_suite_node_id: z.string(),
    check_suite_url: z.string().url(),
    head_branch: z.string(),
    head_sha: z.string(),
    head_commit: workflowRunHeadCommitSchema.nullable().optional(),
    repository: githubRepositorySchema,
    head_repository: githubRepositorySchema,
    pull_requests: z.array(workflowRunPullRequestSchema),
    referenced_workflows: z.array(referencedWorkflowSchema).optional(),
    actor: githubUserSchema.optional(),
    triggering_actor: githubUserSchema.optional(),
    display_title: z.string().optional(),
  })
  .passthrough();

export const githubWorkflowRunWebhookSchema = z
  .object({
    action: z.enum(["completed", "requested", "in_progress"]),
    enterprise: githubEnterpriseSchema.optional(),
    installation: githubInstallationSchema.optional(),
    organization: githubOrganizationSchema.optional(),
    repository: githubRepositorySchema,
    sender: githubUserSchema,
    workflow: githubWorkflowSchema.nullable(),
    workflow_run: githubWorkflowRunSchema,
  })
  .passthrough();

export type githubWorkflowRunWebhookSchemaDto = z.infer<typeof githubWorkflowRunWebhookSchema>;

export const githubWorkflowRunEventSchema = z.object({
  event: z.string(),
  data: githubWorkflowRunWebhookSchema,
});

export type githubWorkflowRunEventSchemaDto = z.infer<typeof githubWorkflowRunEventSchema>;
