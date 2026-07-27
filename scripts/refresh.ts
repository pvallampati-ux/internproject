import { runRefresh } from "../lib/refresh";

runRefresh()
  .then((summary) => {
    console.log(JSON.stringify(summary, null, 2));
    if (summary.errors.length > 0) process.exitCode = 1;
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
