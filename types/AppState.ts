export interface AppTask {
    taskId: number;
    M: number;
}


export interface AppState {
    tasks: AppTask[];
    results: { [key: number]: { fileId: number, result: number, fileSize: number }[] },
    workers: any[],
    idleWorkers: any[]
}