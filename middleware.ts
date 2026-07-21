import createMiddleware from "next-intl/middleware"
import { routing } from "./src/i18n/routing"

// This middleware intercepts all requests and:
//   1. Detects the locale from the URL prefix, Accept-Language header, or cookie
//   2. Redirects un-prefixed paths to the correct locale prefix
//   3. Sets the locale cookie for future requests
export default createMiddleware(routing)

export const config = {
  // Match all pathnames except:
  //   - Next.js internals (_next/*)
  //   - API routes (api/*)
  //   - Static files (files with extensions like .ico, .png, etc.)
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
}
