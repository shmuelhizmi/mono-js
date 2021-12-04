import * as pathClient from "path";
import * as fsClient from "fs/promises";
import * as gitClient from "nodegit";

export function createFolderInRepoIfDoesNotExist(
  repo: gitClient.Repository,
  folderPath: string
): Promise<void> {
  const newFolderPath = pathClient.join(repo.workdir(), folderPath);
  return createFolderIfDoesNotExist(newFolderPath);
}

export function createFolderIfDoesNotExist(folderPath: string): Promise<void> {
  return fsClient
    .stat(folderPath)
    .then(() => {
      // Folder already exists
    })
    .catch(() => {
      // Folder does not exist
      return fsClient.mkdir(folderPath);
    });
}

export async function folderExistInRepo(
  repo: gitClient.Repository,
  folderPath: string
): Promise<boolean> {
  const newFolderPath = pathClient.join(repo.workdir(), folderPath);
  try {
    await fsClient.stat(newFolderPath);
    return true;
  } catch (e) {
    return false;
  }
}

export async function writeJson(
  repo: gitClient.Repository,
  filePath: string,
  data: any
) {
  return write(repo, filePath, JSON.stringify(data, null, 2));
}

export async function write(
  repo: gitClient.Repository,
  filePath: string,
  data: string
) {
  const filePathInRepo = pathClient.join(repo.workdir(), filePath);
  await fsClient.writeFile(filePathInRepo, data);
}
