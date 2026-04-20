import { ActionTypes, EventType } from "@prisma/client";


const allGitHubActionTypes = [
    ActionTypes.collect_viewer_data,
    ActionTypes.send_email,
    ActionTypes.send_email_to_me,
    ActionTypes.send_email_to_who_send_the_trigger,
    ActionTypes.webhook,
    ActionTypes.send_telegram,
] as const;

const gitHubActionTypesForIssuesEvent = [
    ActionTypes.collect_viewer_data,
    ActionTypes.send_email,
    ActionTypes.send_email_to_me,
    ActionTypes.send_email_to_who_send_the_trigger,
    ActionTypes.webhook,
    ActionTypes.send_telegram,
    ActionTypes.analytics_data_by_AI
] as const;

export const githubEventActionSupport: Record<EventType, readonly ActionTypes[]> = {
    star: allGitHubActionTypes,
    issues: gitHubActionTypesForIssuesEvent,


    installation: allGitHubActionTypes,
    commit_comment: allGitHubActionTypes,
    create: allGitHubActionTypes,
    delete: allGitHubActionTypes,
    fork: allGitHubActionTypes,
    issue_comment: allGitHubActionTypes,
    label: allGitHubActionTypes,
    pull_request: allGitHubActionTypes,
    pull_request_review: allGitHubActionTypes,
    push: allGitHubActionTypes,
    repository: allGitHubActionTypes,
    watch: allGitHubActionTypes,
    workflow_job: allGitHubActionTypes,
    workflow_run: allGitHubActionTypes,
};

