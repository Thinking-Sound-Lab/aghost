"use client"

import dynamic from "next/dynamic"

/**
 * The dashboard with sample data, to click through before signing up. It
 * renders in the browser only, so its dates count from the visitor's today.
 */
export const DemoDashboard = dynamic(
  () => import("./demo-app").then((module) => module.DemoApp),
  {
    ssr: false,
    loading: () => (
      <div
        aria-hidden="true"
        className="h-[42.5rem] border border-ink/10 bg-card md:h-[48.5rem]"
      />
    ),
  }
)
