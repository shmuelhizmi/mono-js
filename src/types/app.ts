import { Action, ActionInstance } from "./actions";
import { Resolable } from "./promise";

export interface AppProps {
  location: string;
  name: string;
  git: {
    credentials: string;
  };
  debug: (...args: any[]) => void;
  hoist: boolean | string[];
}

export interface AppMonoRepoModule {
  type: "mono-repo";
  repo: string;
  branch: string;
  configPath: `${string}${"lerna" | "package"}.json`;
}

export interface AppSinglePackageModule {
  type: "single-package";
  repo: string;
  branch: string;
  packagePath: `${string}${"package.json"}`;
}

export type AppModule = AppMonoRepoModule | AppSinglePackageModule;

export interface AppData {
  props: AppProps;
  modules: AppModule[];
  actions: Action[];
  lifeCycleActions: string[];
}

export type AppAction = (PullModulesAction | BootstrapAction | RunAction) & Resolable;


export interface PullModulesAction {
    type: "pull-modules";
}

export interface BootstrapAction {
    type: "bootstrap";
}

export interface RunAction {
    type: "run-action";
    action: string;
}


export interface AppInstance {
    merge(module: AppMonoRepoModule): AppInstance;
    merge(module: AppSinglePackageModule): AppInstance;
    compile(): AppInstance;
    describe(name: string, definder: (tasks: ActionInstance) => void): string;
    addActionToLifeCycle(name: string): void;
    runAction(action: string): Promise<void>;
    init(): Promise<void>;
}

export interface App extends AppData, AppInstance {
    compiled: boolean;
    queue: AppAction[];
}