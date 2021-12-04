import { App, PullModulesAction } from "./types/app";
import * as git from "./git";
import * as mono from "./mono";
import * as cli from "./cli";
import * as gitClient from "nodegit";
import { createResolvable, sleep } from "./helper";

export async function executer(app: App, repo: gitClient.Repository) {
  while (true) {
    const action = app.queue.shift();
    if (!action) {
      await sleep(1000);
      continue;
    }

    if (action.type === "pull-modules") {
      await git.awaitForPull(repo);
      await mono.spawnMonoRepo(repo, app);
      continue;
    }

    if (action.type === "bootstrap") {
      await cli.bootstrap(app, repo);
      continue;
    }

    if (action.type === "run-action") {
      await cli.runAction(app, action.action);
      continue;
    }
    throw new Error("Unknown action type: " + (action as any).type);
  }
}

export default async function engine(app: App) {
  const repo = await git.initializeRepo(app.props.location);

  for (const module of app.modules) {
    await git.installModule(repo, module, app.props.git.credentials);
  }

  await mono.spawnMonoRepo(repo, app);

  executer(app, repo);

  const bootstrap = () =>
    app.queue.push(
      createResolvable({
        type: "bootstrap",
      })
    );

  bootstrap();

  while (true) {
    for (const action of app.actions) {
      app.queue.push(
        createResolvable({
          type: "run-action",
          action: action.name,
        })
      );
    }
    const pullAction = createResolvable<PullModulesAction>({
      type: "pull-modules",
    });
    app.queue.push(pullAction);
    bootstrap();

    // wait for changes
    await pullAction.await();
  }
}
