# Workflow Module

The Workflow module provides REST API endpoints for managing workflows in the application. It handles CRUD operations for user-defined workflows tied to repository events.

## Overview

The module consists of:

- **WorkflowService**: Business logic for workflow operations
- **WorkflowController**: REST API endpoints
- **DTOs**: Data transfer objects for validation
- **github-workflow-action-rules**: Validation rules for GitHub event actions

## Architecture

### Module Dependencies

```
WorkflowModule
├── PrismaModule (database access)
├── WorkflowService
└── WorkflowController
```

## API Endpoints

### Create Workflow

- **Endpoint**: `POST /api/v1/workflow`
- **Rate Limit**: 15 requests per 60 seconds
- **Authentication**: Session-based (user ID from req.session)
- **Request Body**:
  ```typescript
  {
    name: string;           // Required, non-empty string
    platform: Platform;     // Required (e.g., "GitHub")
    repoId: string;         // Required, repository ID
    eventType: EventType;   // Required (e.g., "push", "issues")
    action: string;         // Required for GitHub events
    config?: JSON;          // Optional workflow configuration
  }
  ```
- **Response**: Created workflow object

### Get All Workflows

- **Endpoint**: `GET /api/v1/workflow`
- **Rate Limit**: 30 requests per 60 seconds
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10, max: 100)
- **Response**: Paginated list of workflows (config excluded)

### Get One Workflow

- **Endpoint**: `GET /api/v1/workflow/:id`
- **Rate Limit**: 30 requests per 60 seconds
- **Response**: Single workflow object

### Update Workflow

- **Endpoint**: `PATCH /api/v1/workflow/:id`
- **Rate Limit**: 10 requests per 60 seconds
- **Request Body** (at least one field required):
  ```typescript
  {
    name?: string;
    enabled?: boolean;
    repoId?: string;
    platform?: Platform;
    eventType?: EventType;
    config?: JSON;
  }
  ```
- **Response**: Updated workflow metadata

### Delete Single Workflow

- **Endpoint**: `DELETE /api/v1/workflow/:id`
- **Response**: Deleted workflow info

### Delete Multiple Workflows

- **Endpoint**: `DELETE /api/v1/workflow`
- **Rate Limit**: 10 requests per 60 seconds
- **Request Body**:
  ```typescript
  {
    ids: string[];  // Array of workflow IDs to delete
  }
  ```
- **Response**: Deletion count and IDs

## Validation Rules

### GitHub Event Actions

The module validates GitHub event actions based on event type:

| Event Type            | Allowed Actions                                                                                                                                                                                                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `installation`        | created, deleted, new_permissions_accepted, suspend, unsuspend                                                                                                                                                                                                                   |
| `star`                | created, deleted                                                                                                                                                                                                                                                                 |
| `watch`               | started                                                                                                                                                                                                                                                                          |
| `label`               | created, deleted, edited                                                                                                                                                                                                                                                         |
| `issues`              | assigned, closed, deleted, demilestoned, edited, labeled, locked, milestoned, opened, pinned, reopened, transferred, typed, unassigned, unlabeled, unlocked, unpinned, untyped                                                                                                   |
| `issue_comment`       | created, deleted, edited                                                                                                                                                                                                                                                         |
| `push`                | (none - webhook only)                                                                                                                                                                                                                                                            |
| `pull_request`        | assigned, auto_merge_disabled, auto_merge_enabled, closed, converted_to_draft, demilestoned, dequeued, edited, enqueued, labeled, locked, milestoned, opened, ready_for_review, reopened, review_request_removed, review_requested, synchronize, unassigned, unlabeled, unlocked |
| `repository`          | archived, created, deleted, edited, privatized, publicized, renamed, transferred, unarchived                                                                                                                                                                                     |
| `commit_comment`      | created                                                                                                                                                                                                                                                                          |
| `fork`                | (none - webhook only)                                                                                                                                                                                                                                                            |
| `pull_request_review` | dismissed, edited, submitted                                                                                                                                                                                                                                                     |
| `create`              | (none - webhook only)                                                                                                                                                                                                                                                            |
| `delete`              | (none - webhook only)                                                                                                                                                                                                                                                            |
| `workflow_job`        | completed, in_progress, queued, waiting                                                                                                                                                                                                                                          |
| `workflow_run`        | completed, in_progress, requested                                                                                                                                                                                                                                                |

## Error Handling

- `404 Not Found`: Workflow not found or repository not found
- `400 Bad Request`: Invalid input (e.g., limit too high, no fields provided)
- `500 Internal ServerError`: Database or server errors

## Rate Limiting

All endpoints are protected with rate limiting:

- Create: 15 requests/60s
- Read (all): 30 requests/60s
- Read (one): 30 requests/60s
- Update: 10 requests/60s
- Delete (single): No limit
- Delete (many): 10 requests/60s
