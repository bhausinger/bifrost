import { useState, useEffect, useCallback } from 'react'
import {
  gmailStatus as fetchGmailStatus,
  gmailAuthUrl,
  gmailCallback,
  gmailDisconnect as apiGmailDisconnect,
} from '@/lib/api/gmail'

type GmailStatus = { connected: false } | { connected: true; email: string }

const GMAIL_POPUP_DIMENSIONS = 'width=600,height=700'
const GMAIL_POPUP_CHECK_INTERVAL_MS = 500

type UseGmailReturn = {
  status: GmailStatus
  isLoading: boolean
  connect: () => Promise<void>
  disconnect: () => Promise<void>
}

export function useGmail(): UseGmailReturn {
  const [status, setStatus] = useState<GmailStatus>({ connected: false })
  const [isLoading, setIsLoading] = useState(true)

  const checkStatus = useCallback(async (): Promise<void> => {
    try {
      const data = await fetchGmailStatus()
      setStatus(
        data.connected ? { connected: true, email: data.email ?? '' } : { connected: false },
      )
    } catch {
      // Status check failed — keep current state
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    checkStatus()
  }, [checkStatus])

  async function exchangeCode(code: string): Promise<void> {
    await gmailCallback(code)
    checkStatus()
  }

  async function connect(): Promise<void> {
    try {
      const { authUrl } = await gmailAuthUrl()

      const popup = window.open(authUrl, 'gmail-auth', GMAIL_POPUP_DIMENSIONS)
      const interval = setInterval(() => {
        try {
          if (!popup || popup.closed) {
            clearInterval(interval)
            checkStatus()
            return
          }
          const popupUrl = popup.location.href
          if (popupUrl.includes('code=')) {
            const url = new URL(popupUrl)
            const code = url.searchParams.get('code')
            popup.close()
            clearInterval(interval)
            if (code) exchangeCode(code)
          }
        } catch {
          // Cross-origin — popup hasn't redirected back yet
        }
      }, GMAIL_POPUP_CHECK_INTERVAL_MS)
    } catch {
      // Auth URL fetch failed
    }
  }

  async function disconnect(): Promise<void> {
    await apiGmailDisconnect()
    setStatus({ connected: false })
  }

  return { status, isLoading, connect, disconnect }
}
