import * as gitClient from "nodegit";
import * as pathClient from "path";
import * as git from "./git";
import glob from "glob";
import { App, AppModule } from "./types/app";
import { promisify } from "util";
import * as fs from "./fs";
import { MonoRepoConfig } from "./types/mono";

export async function getWorkspacePackages(
  mono: gitClient.Repository,
  module: AppModule
) {
  const moduleRootPath = pathClient.join(
    mono.workdir(),
    git.getModulePath(module)
  );
  if (module.type === "mono-repo") {
    const configPath = pathClient.join(moduleRootPath, module.configPath);
    let workspaces: string[] | undefined;
    const config = require(configPath);
    if (configPath.endsWith("package.json")) {
      if (Array.isArray(config.workspaces)) {
        workspaces = config.workspaces;
      } else if (config.workspaces?.packages) {
        workspaces = config.workspaces.packages;
      }
    } else if (configPath.endsWith("lerna.json")) {
      workspaces = config.packages;
    }
    if (!workspaces) {
      throw new Error(`Cannot find workspaces in ${configPath}`);
    }

    const packages = await Promise.all(
      workspaces.map(async (workspace) => {
        const globPath = pathClient.join(
          moduleRootPath,
          workspace,
          "/package.json"
        );
        return promisify(glob)(globPath);
      })
    );
    return packages.flat().filter((path) => !path.includes("node_modules"));
  } else {
    const packageJsonPath = pathClient.join(moduleRootPath, "package.json");
    return [packageJsonPath];
  }
}

export function getpackagesFolders(packages: string[]) {
  return packages.map((packagePath) => pathClient.dirname(packagePath));
}

export function projectNameToPackageName(projectName: string) {
  return projectName.replace(/[^a-zA-Z0-9]/g, "-");
}

export async function generateRootPackageJson(
  mono: gitClient.Repository,
  app: App
) {
  const packages = (
    await Promise.all(
      app.modules.map(async (module) => {
        return await getWorkspacePackages(mono, module);
      })
    )
  ).flat();
  const resolutions = packages
    .map((packagePath) => require(packagePath))
    .reduce(
      (res, json) => ({ ...res, [json.name]: json.version }),
      {} as Record<string, string>
    );
  const packagesFolders = getpackagesFolders(packages);
  const relativePackagesFolders = packagesFolders.map((packageFolder) =>
    pathClient.relative(mono.workdir(), packageFolder)
  );

  return {
    name: projectNameToPackageName(app.props.name),
    version: "0.0.0",
    private: true,
    workspaces: {
      packages: relativePackagesFolders,
      nohoist: ["*"],
    },
    resolutions: resolutions,
  };
}

export async function spawnMonoRepo(mono: gitClient.Repository, app: App) {
  const rootPackageJson = await generateRootPackageJson(mono, app);
  await fs.writeJson(mono, "package.json", rootPackageJson);
  await fs.write(
    mono,
    ".gitignore",
    `node_modules`
  );
  await monoConfigSet(mono, "isBootstraped", false);
}

export function monoConfigGet<K extends keyof MonoRepoConfig>(
  mono: gitClient.Repository,
  key: K
): MonoRepoConfig[K] {
  const configPath = pathClient.join(mono.workdir(), "package.json");
  const config = require(configPath);

  return config.monoJSConfig?.[key] as MonoRepoConfig[K];
}

export async function monoConfigSet<K extends keyof MonoRepoConfig>(
  mono: gitClient.Repository,
  key: K,
  value: MonoRepoConfig[K]
) {
  const configPath = pathClient.join(mono.workdir(), "package.json");
  const config = require(configPath);

  config.monoJSConfig = config.monoJSConfig || {};
  config.monoJSConfig[key] = value;

  await fs.writeJson(mono, "package.json", config);
}
