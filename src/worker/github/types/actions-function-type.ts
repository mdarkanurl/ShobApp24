

export type Actions_function_type = {
    success: false,
    message: string,
    error?: Error | any
} | {
    success: true,
    message?: string,
    data: string
}

