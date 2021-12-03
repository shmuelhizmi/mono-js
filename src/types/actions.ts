export interface Action {
    name: string;
    steps: Step[];
}

export interface Step extends Task {
    name: string;
}

export type Task = ScriptTask;

export interface TskBase {
    name: string;
}

export interface ScriptTask extends TskBase {
    type: 'script';
    script: string;
    where: string[];
}

export interface ActionInstance {
    queue(task: Task): void;
}