
export type Class_methods_type = {
    success: false,
    message: string,
    allUpTo: boolean,
    requeue: boolean
} | {
    success: true,
    message?: string,
    allUpTo?: boolean
}
