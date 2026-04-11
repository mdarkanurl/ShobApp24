
export type ActionExecutionResult = {
    success: true;
    output?: unknown;
} | {
    success: false;
    message: string;
    error?: unknown;
    requeue?: boolean;
};

