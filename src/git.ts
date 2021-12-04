import client from "nodegit";
import { AppModule } from "./types/app";
import * as fs from "./fs";
import { sleep } from "./helper";

const MODULE_FOLDER = "modules";
const PULL_INTERVAL = 10000;
const FALSE = 0;
const TRUE = 1;

export function initializeRepo(path: string) {
  return fs.createFolderIfDoesNotExist(path).then(() => {
    return client.Repository.open(path)
      .catch(() => client.Repository.init(path, FALSE))
      .then(async (repo) => {
        await fs.createFolderInRepoIfDoesNotExist(repo, "modules");
        return repo;
      });
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
  const path = getModulePath(module);
  let submodule: client.Submodule;
  const exist = await fs.folderExistInRepo(repo, path);
  if (exist) {
    submodule = await client.Submodule.lookup(repo, path);
  } else {
    submodule = await client.Submodule.addSetup(repo, module.repo, path, FALSE);
  }
  const submoduleRepo = await submodule.open();
  await submoduleRepo.fetch("origin", getFetchOptions(token));
  const commit = await submoduleRepo.getBranchCommit("origin/" + module.branch);
  try {
    await submoduleRepo.createBranch(module.branch, commit);
  } catch(e) {
    await submoduleRepo.mergeBranches(module.branch, "origin/" + module.branch);
  }
  await submoduleRepo.checkoutBranch(module.branch);
}

export async function awaitForPull(repo: client.Repository) {
  let somethingWasUpdated = false;
  while (!somethingWasUpdated) {
    for (const module of await repo.getSubmoduleNames()) {
      const submodule = await client.Submodule.lookup(repo, module);
      const submoduleRepo = await submodule.open();
      const branch = await (await submoduleRepo.getCurrentBranch()).shorthand();
      await submoduleRepo.fetch("origin");

      const remoteCommit = await submoduleRepo.getBranchCommit("origin/" + branch);
      const localCommit = await submoduleRepo.getBranchCommit(branch);
      if (
        remoteCommit.toString() === localCommit.toString()
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
