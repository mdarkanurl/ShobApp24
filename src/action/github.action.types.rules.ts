import { ActionTypes, EventType } from "@prisma/client";

const allGitHubActionTypes = [
    ActionTypes.collect_viewer_data,
    ActionTypes.send_email_to_who_send_the_trigger,
    ActionTypes.webhook,
    ActionTypes.send_telegram,
    ActionTypes.analytics_data_by_AI,
    ActionTypes.send_email,
    ActionTypes.send_email_to_me
] as const;

const gitHubActionTypesForRepositoryEvent = [
    ...allGitHubActionTypes,
    ActionTypes.send_email_for_repository_event
] as const;

const gitHubActionTypesForIssuesEvent = [
    ...allGitHubActionTypes,
    ActionTypes.analytics_the_issue_and_give_rating,
    ActionTypes.send_email_for_issues_event,
    ActionTypes.send_email_to_me_for_issues_event
] as const;

const gitHubActionTypesForPushEvent = [
    ...allGitHubActionTypes,
    ActionTypes.send_email_to_who_push_the_commit,
    ActionTypes.send_email_to_me_for_push_event,
    ActionTypes.send_email_for_push_event
] as const;

const gitHubActionTypesForStarEvent = [
    ...allGitHubActionTypes,
    ActionTypes.send_email_for_star_event
] as const;

export const githubEventActionSupport: Record<EventType, readonly ActionTypes[]> = {
    repository: gitHubActionTypesForRepositoryEvent,
    star: gitHubActionTypesForStarEvent,
    issues: gitHubActionTypesForIssuesEvent,
    push: gitHubActionTypesForPushEvent,


    installation: allGitHubActionTypes,
    commit_comment: allGitHubActionTypes,
    create: allGitHubActionTypes,
    delete: allGitHubActionTypes,
    fork: allGitHubActionTypes,
    issue_comment: allGitHubActionTypes,
    label: allGitHubActionTypes,
    pull_request: allGitHubActionTypes,
    pull_request_review: allGitHubActionTypes,
    watch: allGitHubActionTypes,
    workflow_job: allGitHubActionTypes,
    workflow_run: allGitHubActionTypes,
};

