import app from "../src";
const secret = require("../.secret.json");

const repo = app({
    name: "web desktop environment integration",
  location: "/tmp/web-desktop-environement-monorepo",
  git: {
    credentials: secret.git,
  },
  debug: console.log,
  hoist: false,
})
  .merge({
    type: "mono-repo",
    repo: "https://github.com/shmuelhizmi/react-fullstack",
    branch: "master",
    configPath: "lerna.json",
  })
  .merge({
    type: "mono-repo",
    repo: "https://github.com/shmuelhizmi/web-desktop-environment",
    branch: "main",
    configPath: "package.json",
  })
  .compile();

repo.describe("run tests after bootstrap", (actions) => {
  actions.queue({
    name: "build packages",
    type: "script",
    script: "build",
    where: ["*"],
  });
  actions.queue({
    name: "run tests on packages",
    type: "script",
    script: "test",
    where: ["*"],
  });
});

repo.init();
