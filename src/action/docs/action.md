# Action Module

The Action module provides REST API endpoints for managing actions within workflows. Actions define the tasks to be executed when a workflow event is triggered.

## Overview

The module handles:

- Creating actions for specific workflow events
- Retrieving actions by workflow or by ID
- Updating existing actions
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
- **Description**: Retrieves all actions associated with a workflow, ordered by step number
- **Response**:

```typescript
{
  success: boolean;
  message: string;
  data: Action[];
  error: null;
}
```

### Create Action

- **Endpoint**: `POST /api/v1/action/:workflowId`
- **Authentication**: Session-based
- **Description**: Creates a new action for the specified workflow
- **Request Body**: Action object (schema varies by event type)
- **Validation**:
  - Step number must be sequential (next available step = currentCount + 1)
  - Action type must be supported for the workflow's event type
  - For `send_email_to_me` actions, the email is automatically populated from the user's profile
- **Response**:

```typescript
{
  success: boolean;
  message: string;
  data: Action;
  error: null;
}
```

### Get One Action by ID

- **Endpoint**: `GET /api/v1/action/id/:id`
- **Authentication**: Session-based
- **Description**: Retrieves a single action by its ID
- **Response**:

```typescript
{
  success: boolean;
  message: string;
  data: Action;
  error: null;
}
```

### Update Action by ID

- **Endpoint**: `PUT /api/v1/action/id/:id`
- **Authentication**: Session-based
- **Description**: Updates an existing action
- **Request Body**: Partial action object (config can be updated, type determines allowed fields)
- **Validation**:
  - Action type must remain supported for the workflow's event type
  - Only valid configuration fields for the action type can be updated
- **Response**:

```typescript
{
  success: boolean;
  message: string;
  data: Action;
  error: null;
}
```

### Delete All Actions by Workflow ID

- **Endpoint**: `DELETE /api/v1/action/:workflowId`
- **Authentication**: Session-based
- **Description**: Deletes all actions associated with a workflow
- **Response**:

```typescript
{
  success: boolean;
  message: string;
  data: {
    workflowId: string;
    deletedCount: number;
  }
  error: null;
}
```

### Delete Action by ID

- **Endpoint**: `DELETE /api/v1/action/id/:id`
- **Authentication**: Session-based
- **Description**: Deletes a single action by its ID
- **Note**: After deletion, subsequent actions' step numbers are decremented by 1
- **Response**:

```typescript
{
  success: boolean;
  message: string;
  data: Action;
  error: null;
}
```

## Action Types

### Common Actions (All Events)

| Type                                 | Config Required | Description                      |
| ------------------------------------ | --------------- | -------------------------------- |
| `collect_viewer_data`                | No              | Collect viewer information       |
| `webhook`                            | Yes             | Send HTTP POST to configured URL |
| `send_telegram`                      | Yes             | Send message via Telegram        |
| `analytics_data_by_AI`               | No              | Analytics data using AI          |
| `send_email_to_who_send_the_trigger` | Yes             | Send email to trigger sender     |
| `send_email`                         | Yes             | Send email to specified address  |
| `send_email_to_me`                   | Yes             | Send email to authenticated user |

### Repository Event Actions

| Type                              | Config Required | Description                     |
| --------------------------------- | --------------- | ------------------------------- |
| `send_email_for_repository_event` | Yes             | Send email with repository info |

### Push Event Actions

| Type                                | Config Required | Description                       |
| ----------------------------------- | --------------- | --------------------------------- |
| `send_email_for_push_event`         | Yes             | Send email with push event info   |
| `send_email_to_me_for_push_event`   | Yes             | Send email to self with push info |
| `send_email_to_who_push_the_commit` | Yes             | Send email to commit pusher       |

### Star Event Actions

| Type                        | Config Required | Description                     |
| --------------------------- | --------------- | ------------------------------- |
| `send_email_for_star_event` | Yes             | Send email with star event info |

### Issues Event Actions

| Type                                  | Config Required | Description                         |
| ------------------------------------- | --------------- | ----------------------------------- |
| `send_email_for_issues_event`         | Yes             | Send email with issue info          |
| `send_email_to_me_for_issues_event`   | Yes             | Send email to self with issue info  |
| `analytics_the_issue_and_give_rating` | No              | Analyze issue and provide AI rating |

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
  email: string; // Valid email address
  subject: string; // 3-900 characters
  body: string; // 3-10000 characters
}
```

### Send Email To Me Config

```typescript
{
  subject?: string;    // 3-900 characters
  body?: string;      // 3-10000 characters
}
// Note: Email is auto-populated from user profile
```

### Send Email To Who Send The Trigger Config

```typescript
{
  subject: string; // 3-900 characters
  body: string; // 3-10000 characters
}
```

### Send Email For Push Event Config

```typescript
{
  email: string;                        // Valid email address
  subject: string;                     // 3-900 characters
  body: string;                         // 3-10000 characters
  do_you_want_to_send_push_info?: boolean;        // Default: false
  do_you_want_AI_analytics_of_push_data?: boolean; // Default: false
}
```

### Send Email To Me For Push Event Config

```typescript
{
  subject?: string;                     // 3-900 characters, optional
  body?: string;                         // 3-10000 characters, optional
  do_you_want_push_info?: boolean;       // Default: true
  do_you_want_AI_analytics_of_push_data?: boolean; // Default: false
}
// Note: Email is auto-populated from user profile
```

### Send Email To Who Push The Commit Config

```typescript
{
  subject?: string;                       // 3-900 characters, optional
  body?: string;                         // 3-10000 characters, optional
  do_you_want_AI_analytics_of_push_data?: boolean; // Default: false
}
```

### Send Email For Repository Event Config

```typescript
{
  email: string;                   // Valid email address
  subject?: string;             // 3-900 characters, optional
  body?: string;               // 3-10000 characters, optional
  do_you_want_repo_info?: boolean; // Default: false
}
```

### Send Email For Star Event Config

```typescript
{
  email: string;                   // Valid email address
  subject?: string;             // 3-900 characters, optional
  body?: string;               // 3-10000 characters, optional
  do_you_want_viewer_info?: boolean; // Default: false
}
```

### Send Email For Issues Event Config

```typescript
{
  email: string;                   // Valid email address
  subject?: string;             // 3-900 characters, optional
  body?: string;               // 3-10000 characters, optional
  do_you_want_viewer_info?: boolean; // Default: false
}
```

### Send Email To Me For Issues Event Config

```typescript
{
  subject?: string;             // 3-900 characters, optional
  body?: string;               // 3-10000 characters, optional
  do_you_want_viewer_info?: boolean; // Default: false
}
// Note: Email is auto-populated from user profile
```

## Supported Actions by Event Type

| Event Type            | Supported Actions                                                                                                                                                                                                                        |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `repository`          | send_email, send_email_for_repository_event                                                                                                                                                                                              |
| `star`                | collect_viewer_data, webhook, send_telegram, analytics_data_by_AI, send_email_to_who_send_the_trigger, send_email, send_email_to_me, send_email_for_star_event                                                                           |
| `issues`              | collect_viewer_data, webhook, send_telegram, analytics_data_by_AI, send_email_to_who_send_the_trigger, send_email, send_email_to_me, send_email_for_issues_event, send_email_to_me_for_issues_event, analytics_the_issue_and_give_rating |
| `push`                | collect_viewer_data, webhook, send_telegram, analytics_data_by_AI, send_email_to_who_send_the_trigger, send_email, send_email_to_me, send_email_for_push_event, send_email_to_me_for_push_event, send_email_to_who_push_the_commit       |
| `installation`        | collect_viewer_data, webhook, send_telegram, analytics_data_by_AI, send_email_to_who_send_the_trigger, send_email, send_email_to_me                                                                                                      |
| `commit_comment`      | collect_viewer_data, webhook, send_telegram, analytics_data_by_AI, send_email_to_who_send_the_trigger, send_email, send_email_to_me                                                                                                      |
| `create`              | collect_viewer_data, webhook, send_telegram, analytics_data_by_AI, send_email_to_who_send_the_trigger, send_email, send_email_to_me                                                                                                      |
| `delete`              | collect_viewer_data, webhook, send_telegram, analytics_data_by_AI, send_email_to_who_send_the_trigger, send_email, send_email_to_me                                                                                                      |
| `fork`                | collect_viewer_data, webhook, send_telegram, analytics_data_by_AI, send_email_to_who_send_the_trigger, send_email, send_email_to_me                                                                                                      |
| `issue_comment`       | collect_viewer_data, webhook, send_telegram, analytics_data_by_AI, send_email_to_who_send_the_trigger, send_email, send_email_to_me                                                                                                      |
| `label`               | collect_viewer_data, webhook, send_telegram, analytics_data_by_AI, send_email_to_who_send_the_trigger, send_email, send_email_to_me                                                                                                      |
| `pull_request`        | collect_viewer_data, webhook, send_telegram, analytics_data_by_AI, send_email_to_who_send_the_trigger, send_email, send_email_to_me                                                                                                      |
| `pull_request_review` | collect_viewer_data, webhook, send_telegram, analytics_data_by_AI, send_email_to_who_send_the_trigger, send_email, send_email_to_me                                                                                                      |
| `watch`               | collect_viewer_data, webhook, send_telegram, analytics_data_by_AI, send_email_to_who_send_the_trigger, send_email, send_email_to_me                                                                                                      |
| `workflow_job`        | collect_viewer_data, webhook, send_telegram, analytics_data_by_AI, send_email_to_who_send_the_trigger, send_email, send_email_to_me                                                                                                      |
| `workflow_run`        | collect_viewer_data, webhook, send_telegram, analytics_data_by_AI, send_email_to_who_send_the_trigger, send_email, send_email_to_me                                                                                                      |

## Step Ordering

Actions within a workflow are ordered by a `step` field:

- Step numbers must be sequential starting from 1
- When creating a new action, the step must match the next available number (i.e., `currentCount + 1`)
- When deleting an action, subsequent actions have their step numbers automatically decremented

## Error Handling

- `404 Not Found`: Workflow or action not found
- `400 Bad Request`: Invalid input (incorrect step number, unsupported action type for event)
- `500 Internal Server Error`: Database or server errors

## Response Format

All endpoints return a consistent response format:

```typescript
{
  success: boolean;
  message: string;
  data: T;
  error: string | null;
}
```
