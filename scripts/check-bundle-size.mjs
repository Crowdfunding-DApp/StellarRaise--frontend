#!/usr/bin/env node
// Guards against regressing the initial JS payload for `/` — most
// importantly, against something re-introducing an eager
// `@stellar/stellar-sdk` import (see docs/bundle-size.md). Boots the
// already-built production server, fetches `/`, sums the byte size of
// every /_next/static/chunks/*.js file its HTML actually references, and
// fails if that total exceeds BUDGET_BYTES.
//
// Requires `next build` to have already run (the npm script chains them).

import { spawn } from "node:child_process"
import { statSync } from "node:fs"
import { setTimeout as sleep } from "node:timers/promises"

const PORT = process.env.BUNDLE_CHECK_PORT ?? "4173"
const ROUTE = "/"

// Raw (uncompressed) byte budget for the JS shipped on initial load of `/`.
// Baseline after moving stellar-sdk behind a dynamic import: ~747 KB.
// Budget leaves headroom for organic growth while still catching a
// regression on the order of re-inlining stellar-sdk (~300 KB raw), which
// would push this back toward the pre-fix ~1.05 MB.
const BUDGET_BYTES = 850_000

async function waitForServer(url, timeoutMs = 30_000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {
      // not up yet, keep polling
    }
    await sleep(300)
  }
  throw new Error(`Server did not become ready at ${url} within ${timeoutMs}ms`)
}

async function main() {
  // Spawn the local `next` binary directly (not via npx) and detach it into
  // its own process group — `next start` forks a separate next-server
  // process, and a plain SIGTERM to a non-detached child leaves that
  // grandchild running after this script exits.
  const server = spawn("node_modules/.bin/next", ["start", "-p", PORT], {
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  })
  let serverError = ""
  server.stderr.on("data", (chunk) => {
    serverError += chunk.toString()
  })

  try {
    const url = `http://localhost:${PORT}${ROUTE}`
    await waitForServer(url)

    const html = await fetch(url).then((res) => res.text())
    const chunkPaths = [
      ...html.matchAll(/src="(\/_next\/static\/chunks\/[^"]+)"/g),
    ].map((match) => match[1])

    if (chunkPaths.length === 0) {
      throw new Error(
        "No /_next/static/chunks script tags found in the response HTML — is the build broken?"
      )
    }

    const breakdown = chunkPaths.map((chunkPath) => {
      const filePath = `.next${chunkPath.replace("/_next", "")}`
      const { size } = statSync(filePath)
      return { chunkPath, size }
    })
    breakdown.sort((a, b) => b.size - a.size)

    const totalBytes = breakdown.reduce((sum, { size }) => sum + size, 0)

    console.log(`Initial JS for ${ROUTE} (${chunkPaths.length} files):`)
    for (const { chunkPath, size } of breakdown) {
      console.log(`  ${(size / 1024).toFixed(1).padStart(8)} KB  ${chunkPath}`)
    }
    console.log(`  ${"-".repeat(30)}`)
    console.log(`  ${(totalBytes / 1024).toFixed(1).padStart(8)} KB  total`)
    console.log(`  Budget: ${(BUDGET_BYTES / 1024).toFixed(1)} KB`)

    if (totalBytes > BUDGET_BYTES) {
      console.error(
        `\n✗ Initial JS for ${ROUTE} is ${(totalBytes / 1024).toFixed(1)} KB, ` +
          `over the ${(BUDGET_BYTES / 1024).toFixed(1)} KB budget.`
      )
      process.exitCode = 1
    } else {
      console.log("\n✓ Within budget.")
    }
  } finally {
    try {
      process.kill(-server.pid, "SIGTERM")
    } catch {
      server.kill("SIGTERM")
    }
    if (serverError && process.exitCode) {
      console.error(serverError)
    }
  }
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
