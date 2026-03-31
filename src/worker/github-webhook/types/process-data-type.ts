
export type processDataType = {
    success: false,
    message: string,
    allUpTo: boolean,
    requeue: boolean
} | {
    success: true,
    message?: string,
    allUpTo?: boolean
}
