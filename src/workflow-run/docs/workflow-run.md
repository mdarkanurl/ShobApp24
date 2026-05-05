# Workflow Run Module

The Workflow Run module provides REST API endpoints for retrieving execution data of workflow runs. It allows users to view the history of workflow executions and their detailed results.

## Overview

The module handles:

- Retrieving all workflow runs for a workflow (paginated, filterable by status)
- Retrieving a single workflow run by ID with full details

## Architecture

### Module Dependencies

```
WorkflowRunModule
├── PrismaModule (database access)
├── WorkflowRunService
└── WorkflowRunController
```

## API Endpoints

### Get All Workflow Runs by Workflow ID

- **Endpoint**: `GET /api/v1/workflow-run/:workflowId`
- **Rate Limit**: 30 requests per 60 seconds
- **Authentication**: Session-based (user ID from req.session)
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10, max: 100)
  - `status`: Filter by run status (optional): `pending`, `running`, `success`, `failed`, `cancelled`
- **Response**:

```typescript
{
  success: boolean;
  message: string;
  data: {
    data: WorkflowRun[];
    pagination: {
      totalItems: number;
      currentPage: number;
      totalPages: number;
      pageSize: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    }
  };
  error: null;
}
```

- **Notes**:
  - Results are ordered by `startedAt` descending (newest first)
  - Sensitive fields (payload, output) are excluded from the list response
  - The workflow must belong to the authenticated user

### Get One Workflow Run by ID

- **Endpoint**: `GET /api/v1/workflow-run/one/:id`
- **Rate Limit**: 30 requests per 60 seconds
- **Authentication**: Session-based
- **Response**:

```typescript
{
  success: boolean;
  message: string;
  data: WorkflowRun;
  error: null;
}
```

- **Notes**:
  - Returns full workflow run details including payload and output
  - Includes related workflow information (id, name, eventType)
  - Validates user ownership through the workflow relationship

## Data Models

### WorkflowRun (List Response)

```typescript
{
  id: string;
  status: RunStatus;
  workflowId: string;
  startedAt: Date;
  finishedAt: Date;
  // payload, output are excluded
}
```

### WorkflowRun (Detail Response)

```typescript
{
  id: string;
  status: RunStatus;
  workflowId: string;
  payload: JSON;
  output: JSON;
  startedAt: Date;
  finishedAt: Date;
  workflow: {
    id: string;
    name: string;
    eventType: string;
  }
}
```

### RunStatus Enum

| Status      | Description                 |
| ----------- | --------------------------- |
| `pending`   | Run queued, not started yet |
| `running`   | Currently executing         |
| `success`   | Completed successfully      |
| `failed`    | Completed with errors       |
| `cancelled` | Run was cancelled           |

## Error Handling

- `404 Not Found`: Workflow or workflow run not found
- `400 Bad Request`: Invalid limit value (exceeds MAX_LIMIT)
- `500 Internal Server Error`: Database or server errors

## Rate Limiting

All endpoints are protected with rate limiting:

- Get all: 30 requests/60s
- Get one: 30 requests/60s
