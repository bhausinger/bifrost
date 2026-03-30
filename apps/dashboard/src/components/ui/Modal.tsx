import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  maxWidth?: string
}

export function Modal({ open, onClose, title, children, footer, maxWidth = 'max-w-lg' }: ModalProps) {
  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-[fadeIn_150ms_ease-out]"
        onClick={onClose}
      />
      <div
        className={`fixed inset-x-0 top-[10%] z-50 mx-auto w-full ${maxWidth} rounded-xl border border-gray-200 bg-white p-6 shadow-2xl animate-[slideUp_200ms_ease-out]`}
      >
        <h3 className="text-lg font-bold text-gray-900 pb-4 border-b border-gray-100">
          {title}
        </h3>
        <div className="mt-4">{children}</div>
        {footer && (
          <div className="mt-4 flex justify-end gap-3 pt-4 border-t border-gray-100">
            {footer}
          </div>
        )}
      </div>
    </>
  )
}
