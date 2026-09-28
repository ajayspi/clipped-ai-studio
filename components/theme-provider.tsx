"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

// next-themes emits its pre-hydration theme script as a bare <script> with no
// `type`, which React 19 (dev) rejects with "Encountered a script tag while
// rendering React component". React only stays quiet for scripts whose `type`
// is not a JS MIME type, so flip it per environment: the server copy has to
// stay executable, the client copy is never executed by React anyway. This is
// the same server/client flip next-themes does for `nonce`, and the element
// already carries `suppressHydrationWarning`, which is what absorbs the
// resulting attribute difference. See
// node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md
const SCRIPT_PROPS = {
  type: typeof window === "undefined" ? "text/javascript" : "text/plain",
} as const

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider {...props} scriptProps={SCRIPT_PROPS}>
      {children}
    </NextThemesProvider>
  )
}
