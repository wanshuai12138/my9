import { runShareArchive } from "./lib/share/archive";
import openNextWorker from "./.open-next/worker.js";

const worker = {
  fetch(request, env, ctx) {
    return openNextWorker.fetch(request, env, ctx);
  },
  scheduled(controller, env, ctx) {
    ctx.waitUntil(
      runShareArchive({
        coldStorageBucket: env.MY9_COLD_STORAGE ?? null,
        logLabel: `[archive-cron:${controller.cron}]`,
      }).catch((error) => {
        console.error("[archive-cron] failed", error);
        throw error;
      })
    );
  },
};

export default worker;
