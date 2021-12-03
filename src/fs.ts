import * as pathClient from "path";
import * as fsClient from "fs/promises";
import * as gitClient from "nodegit";

export function createFolderInRepoIfDoesNotExist(
  repo: gitClient.Repository,
  folderPath: string
): Promise<void> {
  const newFolderPath = pathClient.join(repo.workdir(), folderPath);
  return fsClient
    .stat(newFolderPath)
    .then(() => {
      // Folder already exists
    })
    .catch(() => {
      // Folder does not exist
      return fsClient.mkdir(newFolderPath);
    });
}

export async function writeJson(
    repo: gitClient.Repository,
    filePath: string,
    data: any
) {
    const filePathInRepo = pathClient.join(repo.workdir(), filePath);
    await fsClient.writeFile(filePathInRepo, JSON.stringify(data, null, 2));
}