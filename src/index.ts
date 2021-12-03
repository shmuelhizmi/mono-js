import engine from "./engine";
import { createResolvable } from "./helper";
import { Action, Step } from "./types/actions";
import { App, AppInstance, AppProps } from "./types/app";

function app(props: AppProps): AppInstance {
  let isInitialized = false;
  const app: App = {
    props,
    actions: [],
    modules: [],
    compiled: false,
    queue: [],
    lifeCycleActions: [],
    merge(module) {
      if (this.compiled) {
        throw new Error("Cannot merge module after compilation");
      }
      this.modules.push(module);
      return this;
    },
    compile() {
      this.compiled = true;
      return this;
    },
    addActionToLifeCycle(name) {
      this.lifeCycleActions.push(name);
    },
    describe(name, definder) {
      const action: Action = {
        name,
        steps: [],
      };
      let definderRunning = true;
      function queue(step: Step) {
        if (!definderRunning) {
          throw new Error(
            "Cannot queue step after definder has finished running"
          );
        }
        action.steps.push(step);
      }
      definder({ queue });
      definderRunning = false;
      this.actions.push(action);
      return name;
    },
    runAction(action) {
      if (!isInitialized) {
        throw new Error("Cannot run action before initialization");
      }
      this.queue.push(
        createResolvable({
          type: "run-action",
          action,
        })
      );
      return this.queue[this.queue.length - 1].await();
    },
    init() {
      if (isInitialized) {
        throw new Error("Cannot initialize app twice");
      }
      isInitialized = true;

      return engine(this);
    },
  };

  return app;
}

export default app;
