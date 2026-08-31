import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (credentials?.email === "admin@clipped.ai" && credentials?.password === "admin") {
          return { 
            id: "11111111-1111-1111-1111-111111111111", // Valid UUID format
            name: "Clipped Admin", 
            email: "admin@clipped.ai" 
          }
        }
        return null
      }
    })
  ],
  pages: {
    signIn: "/login",
  },
})
