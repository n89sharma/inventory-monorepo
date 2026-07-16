import { api } from '@/data/api/axios-client'

const PDF_MIME_TYPE = 'application/pdf'

export async function printPdfBlob(url: string, body: unknown): Promise<void> {
  const response = await api.post(url, body, { responseType: 'blob' })
  const blob = new Blob([response.data], { type: PDF_MIME_TYPE })
  const objectUrl = URL.createObjectURL(blob)

  const iframe = document.createElement('iframe')
  iframe.style.display = 'none'
  iframe.src = objectUrl
  document.body.append(iframe)

  const cleanup = (): void => {
    URL.revokeObjectURL(objectUrl)
    iframe.remove()
  }

  iframe.onload = (): void => {
    const frameWindow = iframe.contentWindow
    if (!frameWindow) {
      cleanup()
      return
    }
    frameWindow.addEventListener('afterprint', cleanup, { once: true })
    frameWindow.focus()
    frameWindow.print()
  }
}
