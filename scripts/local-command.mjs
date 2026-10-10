import { spawn } from "node:child_process"
import { root } from "./local-env.mjs"

export function run(
  command,
  args,
  { env = process.env, cwd = root, capture = false, quiet = false } = {}
) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: [
        "inherit",
        capture ? "pipe" : quiet ? "ignore" : "inherit",
        "inherit",
      ],
    })
    let output = ""
    child.stdout?.on("data", (chunk) => {
      output += chunk
    })
    child.on("error", reject)
    child.on("close", (code, signal) => {
      if (code === 0) resolve(output)
      else
        reject(
          new Error(
            `${command} ${args.join(" ")} exited with ${signal ?? code}.`
          )
        )
    })
  })
}
