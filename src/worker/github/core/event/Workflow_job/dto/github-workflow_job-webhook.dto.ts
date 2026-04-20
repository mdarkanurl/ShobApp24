import { z } from "zod";

const githubUserSchema = z
  .object({
    login: z.string(),
    id: z.number(),
    node_id: z.string(),
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
    full_name: z.string(),
    private: z.boolean(),
    owner: githubUserSchema,
    html_url: z.string().url().optional(),
    url: z.string().url().optional(),
  })
  .passthrough();

const githubDeploymentSchema = z
  .object({
    id: z.number(),
    node_id: z.string(),
    url: z.string().url(),
    sha: z.string(),
    ref: z.string(),
    task: z.string(),
    environment: z.string(),
    original_environment: z.string().nullable().optional(),
    description: z.string().nullable(),
    payload: z.record(z.string(), z.unknown()).optional(),
    creator: githubUserSchema,
    created_at: z.string(),
    updated_at: z.string(),
    statuses_url: z.string().url(),
    repository_url: z.string().url(),
    performed_via_github_app: z.unknown().nullable().optional(),
    production_environment: z.boolean().optional(),
    transient_environment: z.boolean().optional(),
  })
  .passthrough();

const workflowJobStepSchema = z
  .object({
    name: z.string(),
    number: z.number(),
    status: z.string(),
    conclusion: z.string().nullable(),
    started_at: z.string().nullable(),
    completed_at: z.string().nullable(),
  })
  .passthrough();

const githubWorkflowJobSchema = z
  .object({
    id: z.number(),
    node_id: z.string(),
    name: z.string(),
    labels: z.array(z.string()),
    status: z.string(),
    conclusion: z.string().nullable(),
    started_at: z.string().nullable(),
    completed_at: z.string().nullable(),
    url: z.string().url().optional(),
    html_url: z.string().url().optional(),
    check_run_url: z.string().url().optional(),
    run_id: z.number(),
    run_url: z.string().url().optional(),
    run_attempt: z.number().optional(),
    head_sha: z.string(),
    head_branch: z.string().nullable().optional(),
    workflow_name: z.string().optional(),
    steps: z.array(workflowJobStepSchema).optional(),
    runner_id: z.number().nullable().optional(),
    runner_name: z.string().nullable().optional(),
    runner_group_id: z.number().nullable().optional(),
    runner_group_name: z.string().nullable().optional(),
  })
  .passthrough();

export const githubWorkflowJobWebhookSchema = z
  .object({
    action: z.enum(["queued", "in_progress", "completed", "waiting"]),
    deployment: githubDeploymentSchema.optional(),
    enterprise: githubEnterpriseSchema.optional(),
    installation: githubInstallationSchema.optional(),
    organization: githubOrganizationSchema.optional(),
    repository: githubRepositorySchema,
    sender: githubUserSchema,
    workflow_job: githubWorkflowJobSchema,
  })
  .passthrough();

export type githubWorkflowJobWebhookSchemaDto = z.infer<typeof githubWorkflowJobWebhookSchema>;

export const githubWorkflowJobEventSchema = z.object({
  event: z.string(),
  data: githubWorkflowJobWebhookSchema,
});

export type githubWorkflowJobEventSchemaDto = z.infer<typeof githubWorkflowJobEventSchema>;
