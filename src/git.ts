import * as client from "nodegit";
import { AppModule } from "./types/app";
import * as fs from "./fs";
import { sleep } from "./helper";

const MODULE_FOLDER = "modules";
const PULL_INTERVAL = 20000;
const FALSE = 0;
const TRUE = 1;

export function initializeRepo(path: string) {
  return client.Repository.open(path)
    .catch(() => client.Repository.init(path, FALSE))
    .then(async (repo) => {
      await fs.createFolderInRepoIfDoesNotExist(repo, "modules");
      return repo;
    });
}

export function parseModuleData(module: AppModule) {
  const { repo } = module;
  // get get oragnization and repo name from htttps://github.com/org/repo
  const [, org, repoName] = repo.match(/github.com\/(.*)\/(.*)/) || [];
  return {
    org,
    repoName,
  };
}

export function getModulePath(module: AppModule) {
  const { org, repoName } = parseModuleData(module);
  return `${MODULE_FOLDER}/${org}/${repoName}`;
}

export function getFetchOptions(token: string) {
  return {
    callbacks: {
      credentials: () =>
        client.Cred.userpassPlaintextNew(token, "x-oauth-basic"),
      certificateCheck: () => FALSE,
    },
  };
}

export async function installModule(
  repo: client.Repository,
  module: AppModule,
  token: string
) {
  const submodule = await client.Submodule.addSetup(
    repo,
    module.repo,
    getModulePath(module),
    FALSE
  );
  await submodule.update(TRUE, {
    fetchOpts: getFetchOptions(token),
  });
  const submoduleRepo = await submodule.open();
  await submoduleRepo.checkoutBranch(module.branch);
}

export async function awaitForPull(repo: client.Repository) {
  let somethingWasUpdated = false;
  while (!somethingWasUpdated) {
    for (const module of await repo.getSubmoduleNames()) {
      const submodule = await client.Submodule.lookup(repo, module);
      const submoduleRepo = await submodule.open();
      const branch = await (await submoduleRepo.getCurrentBranch()).name();
      await submoduleRepo.fetch("origin");
      if (
        submoduleRepo.getBranchCommit("origin/" + branch) ===
        submoduleRepo.getHeadCommit()
      ) {
        continue;
      }
      somethingWasUpdated = true;
      await submoduleRepo.mergeBranches(branch, "origin/" + branch);
    }

    if (!somethingWasUpdated) {
      await sleep(PULL_INTERVAL);
    }
  }
}
