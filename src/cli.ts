import * as client from "child_process";
import { App } from "./types/app";
import * as gitClient from "nodegit";
import * as mono from "./mono";

function execute(
  command: string,
  args: string[],
  options: client.ExecOptions
): Promise<void> {
  const child = client.spawn(command, args, options);
  if (!child) {
    return Promise.reject(new Error("Failed to execute command"));
  }
  child.stdout?.pipe(process.stdout);
  return new Promise<void>((resolve, reject) => {
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Command failed with code ${code}`));
      } else {
        resolve();
      }
    });
  });
}

export async function bootstrap(app: App, repo: gitClient.Repository) {
  if (mono.monoConfigGet(repo, "isBootstraped")) {
    return;
  }
  return execute("yarn", [], { cwd: app.props.location }).then(() =>
    mono.monoConfigSet(repo, "isBootstraped", true)
  );
}

export async function runAction(app: App, actionName: string) {
  const action = app.actions.find((a) => a.name === actionName);
  if (!action) {
    throw new Error(`Action ${actionName} not found`);
  }
  for (const step of action.steps) {
    if (step.type === "script") {
      await execute("wsrun", ["--serial", "--fast-exit", "--exclude-missing", step.script], {
        cwd: app.props.location,
      });
    }
  }
}
