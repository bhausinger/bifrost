import { z } from 'zod'

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url('VITE_SUPABASE_URL must be a valid URL'),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, 'VITE_SUPABASE_ANON_KEY is required'),
  VITE_SCRAPER_URL: z.string().url().optional().default('http://localhost:9999'),
})

function validateEnv(): z.infer<typeof envSchema> {
  const result = envSchema.safeParse({
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    VITE_SCRAPER_URL: import.meta.env.VITE_SCRAPER_URL,
  })

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors
    const message = Object.entries(errors)
      .map(([key, msgs]) => `  ${key}: ${msgs?.join(', ')}`)
      .join('\n')
    throw new Error(
      `Missing or invalid environment variables:\n${message}\n\n` +
      'Copy .env.example to .env and fill in the values.'
    )
  }

  return result.data
}

export const env = validateEnv()
