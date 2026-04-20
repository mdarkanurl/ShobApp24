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
  site_admin: z.boolean(),
});

const labelSchema = z.object({
  id: z.number(),
  node_id: z.string(),
  url: z.string().url(),
  
  name: z.string(),
  color: z.string(),
  default: z.boolean(),
  description: z.string().nullable(),
}).partial({
  id: true,
  node_id: true,
  url: true,
  name: true,
  color: true,
  default: true,
  description: true,
});

const milestoneSchema = z.object({
  url: z.string().url(),
  html_url: z.string().url(),
  labels_url: z.string(),
  
  id: z.number(),
  node_id: z.string(),
  number: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  creator: githubUserSchema.nullable(),
  
  open_issues: z.number(),
  closed_issues: z.number(),
  state: z.enum(["open", "closed"]),
  
  created_at: z.string(),
  updated_at: z.string(),
  due_on: z.string().nullable(),
  closed_at: z.string().nullable(),
}).partial();

const reactionsSchema = z.object({
  url: z.string().url(),
  total_count: z.number(),
  
  "+1": z.number(),
  "-1": z.number(),
  laugh: z.number(),
  hooray: z.number(),
  confused: z.number(),
  heart: z.number(),
  rocket: z.number(),
  eyes: z.number(),
});

const issueSchema = z.object({
  url: z.string().url(),
  repository_url: z.string().url(),
  labels_url: z.string(),
  comments_url: z.string().url(),
  events_url: z.string().url(),
  html_url: z.string().url(),
  
  id: z.number(),
  node_id: z.string(),
  number: z.number(),
  title: z.string(),
  user: githubUserSchema,
  labels: z.array(labelSchema),
  
  state: z.enum(["open", "closed"]),
  locked: z.boolean(),
  assignee: githubUserSchema.nullable(),
  assignees: z.array(githubUserSchema),
  milestone: milestoneSchema.nullable(),
  comments: z.number(),
  
  created_at: z.string(),
  updated_at: z.string(),
  closed_at: z.string().nullable(),
  author_association: z.string(),
  active_lock_reason: z.string().nullable(),
  body: z.string().nullable(),
  
  reactions: reactionsSchema,
  timeline_url: z.string().url(),
  performed_via_github_app: z.unknown().nullable(),
  state_reason: z.string().nullable(),
  pinned_comment: z.unknown().nullable(),
  
  sub_issues_summary: z.object({
    total: z.number(),
    completed: z.number(),
    percent_completed: z.number(),
  }).optional(),
  issue_dependencies_summary: z.object({
    blocked_by: z.number(),
    total_blocked_by: z.number(),
    blocking: z.number(),
    total_blocking: z.number(),
  }).optional(),
});

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
  owner: githubUserSchema,
  
  html_url: z.string().url(),
  description: z.string().nullable(),
  fork: z.boolean(),
  url: z.string().url(),
  forks_url: z.string().url(),
  keys_url: z.string(),
  collaborators_url: z.string(),
  teams_url: z.string().url(),
  hooks_url: z.string().url(),
  issue_events_url: z.string(),
  events_url: z.string().url(),
  assignees_url: z.string(),
  branches_url: z.string(),
  tags_url: z.string().url(),
  blobs_url: z.string(),
  git_tags_url: z.string(),
  git_refs_url: z.string(),
  trees_url: z.string(),
  statuses_url: z.string(),
  languages_url: z.string().url(),
  stargazers_url: z.string().url(),
  contributors_url: z.string().url(),
  subscribers_url: z.string().url(),
  subscription_url: z.string().url(),
  commits_url: z.string(),
  git_commits_url: z.string(),
  comments_url: z.string(),
  issue_comment_url: z.string(),
  contents_url: z.string(),
  compare_url: z.string(),
  merges_url: z.string().url(),
  archive_url: z.string(),
  downloads_url: z.string().url(),
  issues_url: z.string(),
  pulls_url: z.string(),
  milestones_url: z.string(),
  notifications_url: z.string(),
  labels_url: z.string(),
  releases_url: z.string(),
  deployments_url: z.string().url(),
  
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
  has_issues: z.boolean(),
  has_projects: z.boolean(),
  has_downloads: z.boolean(),
  has_wiki: z.boolean(),
  has_pages: z.boolean(),
  has_discussions: z.boolean(),
  forks_count: z.number(),
  mirror_url: z.string().url().nullable(),
  archived: z.boolean(),
  disabled: z.boolean(),
  open_issues_count: z.number(),
  license: licenseSchema.nullable(),
  allow_forking: z.boolean(),
  is_template: z.boolean(),
  web_commit_signoff_required: z.boolean(),
  has_pull_requests: z.boolean().optional(),
  pull_request_creation_policy: z.string().optional(),
  topics: z.array(z.string()),
  visibility: z.enum(["public", "private", "internal"]),
  forks: z.number(),
  open_issues: z.number(),
  watchers: z.number(),
  default_branch: z.string(),
});

const installationSchema = z.object({
  id: z.number(),
  node_id: z.string(),
});

export const githubIssuesEventSchema = z.object({
  event: z.string(),
  data: z.object({
    action: z.enum([
      "assigned",
      "closed",
      "deleted",
      "demilestoned",
      "edited",
      "labeled",
      "locked",
      "milestoned",
      "opened",
      "pinned",
      "reopened",
      "transferred",
      "typed",
      "unassigned",
      "unlabeled",
      "unlocked",
      "unpinned",
      "untyped",
    ]),
    
    issue: issueSchema,
    repository: repositorySchema,
    sender: githubUserSchema,
    installation: installationSchema,
  }),
});

export type githubIssuesEventSchemaDto = z.infer<typeof githubIssuesEventSchema>;
