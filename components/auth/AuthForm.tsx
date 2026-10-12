"use client"

import Link from "next/link"
import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Video, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export type AuthMode = "login" | "register"

const COPY: Record<
  AuthMode,
  { title: string; subtitle: string; submit: string; footerText: string; footerLink: string; footerHref: string }
> = {
  login: {
    title: "Welcome back",
    subtitle: "Enter your credentials to access your account",
    submit: "Sign In",
    footerText: "Don't have an account?",
    footerLink: "Sign up",
    footerHref: "/register",
  },
  register: {
    title: "Create an account",
    subtitle: "Enter your email to get started",
    submit: "Sign Up",
    footerText: "Already have an account?",
    footerLink: "Sign in",
    footerHref: "/login",
  },
}

/** Shared email+password form behind /login and /register (same fields, same chrome; only copy + submit differ). */
export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const copy = COPY[mode]

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError("")
    setMessage("")
    setLoading(true)
    try {
      if (mode === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (signInError) {
          setError(signInError.message || "Invalid email or password.")
        } else {
          router.push("/dashboard")
          router.refresh()
        }
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        })
        if (signUpError) {
          setError(signUpError.message || "Failed to sign up.")
        } else {
          setMessage("Success! Please check your email for a confirmation link (if enabled) or go to login.")
          setTimeout(() => router.push("/login"), 3000)
        }
      }
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <Video className="h-6 w-6" />
            Clipped
          </Link>
          <h1 className="text-2xl font-bold">{copy.title}</h1>
          <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          {message && (
            <div className="rounded-md border border-green-500 bg-green-500/10 px-3 py-2 text-sm text-green-500">
              {message}
            </div>
          )}
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : copy.submit}
          </button>
        </form>

        <div className="text-center text-sm">
          {copy.footerText}{" "}
          <Link href={copy.footerHref} className="font-medium underline underline-offset-4 hover:text-primary">
            {copy.footerLink}
          </Link>
        </div>
      </div>
    </div>
  )
}
