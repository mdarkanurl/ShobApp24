# Action Module

The Action module provides REST API endpoints for managing actions within workflows. Actions define the tasks to be executed when a workflow event is triggered.

## Overview

The module handles:

- Creating actions for specific workflow events
- Retrieving actions by workflow or by ID
- Deleting individual actions or all actions in a workflow
- Step-based ordering of actions within a workflow

## Architecture

### Module Dependencies

```
ActionModule
├── PrismaModule (database access)
├── ActionService
└── ActionController
```

## API Endpoints

### Get All Actions by Workflow ID

- **Endpoint**: `GET /api/v1/action/:workflowId`
- **Authentication**: Session-based (user ID from req.session)
- **Response**: Array of actions ordered by step number

### Create Action

- **Endpoint**: `POST /api/v1/action/:workflowId`
- **Authentication**: Session-based
- **Request Body**: Action object (schema varies by event type)
- **Validation**:
  - Step number must be sequential (next available step)
  - Action type must be supported for the workflow's event type
- **Response**: Created action object

### Get One Action by ID

- **Endpoint**: `GET /api/v1/action/id/:id`
- **Authentication**: Session-based
- **Response**: Single action object

### Delete All Actions by Workflow ID

- **Endpoint**: `DELETE /api/v1/action/:workflowId`
- **Authentication**: Session-based
- **Response**: Deletion count and workflow ID

### Delete Action by ID

- **Endpoint**: `DELETE /api/v1/action/id/:id`
- **Authentication**: Session-based
- **Response**: Deleted action info
- **Note**: After deletion, subsequent actions' step numbers are decremented by 1

## Action Types

### Common Actions (All Events)

| Type                                 | Config Required | Description                      |
| ------------------------------------ | --------------- | -------------------------------- |
| `collect_viewer_data`                | No              | Collect viewer information       |
| `webhook`                            | Yes             | Send HTTP POST to configured URL |
| `send_telegram`                      | Yes             | Send message via Telegram        |
| `analytics_data_by_AI`               | No              | Analytics data using AI          |
| `send_email_to_who_send_the_trigger` | Yes             | Send email to trigger sender     |

### Repository Event Actions

| Type         | Config Required |
| ------------ | --------------- |
| `send_email` | Yes             |

### Push Event Actions

| Type                                | Config Required |
| ----------------------------------- | --------------- |
| `send_email`                        | Yes             |
| `send_email_to_me`                  | Yes             |
| `send_email_to_who_push_the_commit` | Yes             |

### Star Event Actions

| Type               | Config Required |
| ------------------ | --------------- |
| All common actions | See above       |

### Issues Event Actions

| Type                                  | Config Required |
| ------------------------------------- | --------------- |
| `send_email`                          | Yes             |
| `send_email_to_me`                    | Yes             |
| `send_email_to_who_send_the_trigger`  | Yes             |
| `webhook`                             | Yes             |
| `send_telegram`                       | Yes             |
| `collect_viewer_data`                 | No              |
| `analytics_the_issue_and_give_rating` | No              |

## Config Schemas

### Webhook Config

```typescript
{
  url: string; // Must be HTTPS, non-localhost
}
```

### Telegram Config

```typescript
{
  message: string; // 3-10000 characters
}
```

### Send Email Config

```typescript
{
  email: string;      // Valid email address
  subject: string;    // 3-900 characters
  body: string;       // 3-10000 characters
  do_you_want_to_send_push_info?: boolean;   // Push event only
  do_you_want_AI_analytics_of_push_data?: boolean;
  do_you_want_repo_info?: boolean;           // Repository event only
  do_you_want_viewer_info?: boolean;         // Star event only
}
```

### Send Email To Me Config

```typescript
{
  email: string;
  subject?: string;    // 3-900 characters
  body?: string;       // 3-10000 characters
  do_you_want_push_info?: boolean;           // Push event only
  do_you_want_AI_analytics_of_push_data?: boolean;
}
```

### Send Email To Who Push The Commit Config

```typescript
{
  subject?: string;    // 3-900 characters
  body?: string;       // 3-10000 characters
  do_you_want_AI_analytics_of_push_data?: boolean;
}
```

### Send Email To Who Send The Trigger Config

```typescript
{
  subject: string; // 3-900 characters
  body: string; // 3-10000 characters
}
```

## Validation Rules

### Supported Actions by Event Type

| Event Type            | Supported Actions                                                                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `repository`          | send_email                                                                                                                                         |
| `star`                | All common actions                                                                                                                                 |
| `issues`              | send_email, send_email_to_me, send_email_to_who_send_the_trigger, webhook, send_telegram, collect_viewer_data, analytics_the_issue_and_give_rating |
| `push`                | send_email, send_email_to_me, webhook, send_telegram, send_email_to_who_push_the_commit                                                            |
| `installation`        | All common actions                                                                                                                                 |
| `commit_comment`      | All common actions                                                                                                                                 |
| `create`              | All common actions                                                                                                                                 |
| `delete`              | All common actions                                                                                                                                 |
| `fork`                | All common actions                                                                                                                                 |
| `issue_comment`       | All common actions                                                                                                                                 |
| `label`               | All common actions                                                                                                                                 |
| `pull_request`        | All common actions                                                                                                                                 |
| `pull_request_review` | All common actions                                                                                                                                 |
| `watch`               | All common actions                                                                                                                                 |
| `workflow_job`        | All common actions                                                                                                                                 |
| `workflow_run`        | All common actions                                                                                                                                 |

## Step Ordering

Actions within a workflow are ordered by a `step` field:

- Step numbers must be sequential starting from 1
- When creating a new action, the step must match the next available number (i.e., `currentCount + 1`)
- When deleting an action, subsequent actions have their step numbers automatically decremented

## Error Handling

- `404 Not Found`: Workflow or action not found
- `400 Bad Request`: Invalid input (incorrect step number, unsupported action type for event)
- `500 Internal ServerError`: Database or server errors
