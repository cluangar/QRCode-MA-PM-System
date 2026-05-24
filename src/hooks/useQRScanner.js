import { useRef, useEffect } from 'react'
import jsQR from 'jsqr'

export function useQRScanner(videoRef, onResult, active) {
  const rafRef   = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current) canvasRef.current = document.createElement('canvas')
  }, [])

  useEffect(() => {
    if (!active) {
      cancelAnimationFrame(rafRef.current)
      return
    }

    let lastScan = 0

    function scan() {
      const video  = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas) { rafRef.current = requestAnimationFrame(scan); return }

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        const now = Date.now()
        if (now - lastScan > 150) {
          lastScan = now
          canvas.width  = video.videoWidth
          canvas.height = video.videoHeight
          const ctx = canvas.getContext('2d', { willReadFrequently: true })
          ctx.drawImage(video, 0, 0)
          const img  = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })
          if (code?.data) {
            onResult(code.data)
            return
          }
        }
      }

      rafRef.current = requestAnimationFrame(scan)
    }

    rafRef.current = requestAnimationFrame(scan)
    return () => cancelAnimationFrame(rafRef.current)
  }, [active])
}
