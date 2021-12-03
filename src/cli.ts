import * as client from "child_process";
import { App } from "./types/app";

function execute(
  app: App,
  command: string,
  options: client.ExecOptions
): Promise<void> {
  const child = client.exec(command, options);
  if (!child) {
    return Promise.reject(new Error("Failed to execute command"));
  }
  child.stdout?.pipe(process.stdout)
  return new Promise<void>((resolve, reject) => {
    child.on("exit", (code) => {
      resolve();
    });
    child.on("error", (err) => {
      reject(err);
    });
  });
}

export function bootstrap(app: App) {
  return execute(app, "yarn", { cwd: app.props.location });
}

export async function runAction(app: App, actionName: string) {
  const action = app.actions.find((a) => a.name === actionName);
  if (!action) {
    throw new Error(`Action ${actionName} not found`);
  }
  for (const step of action.steps) {
    if (step.type === "script") {
      await execute(app, `$wsrun ${step.script}`, { cwd: app.props.location });
    }
  }
}
