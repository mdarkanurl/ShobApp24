
export type EmailBodyResult = {
    success: true;
    body: string;
} | {
    success: false;
    message: string;
    error?: unknown;
    requeue?: boolean;
};

