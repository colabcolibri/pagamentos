const MAX_RAW_INPUT_BYTES = 10 * 1024 * 1024 // 10 MB
const MAX_LOGO_WIDTH = 512
const MAX_LOGO_HEIGHT = 256
const TARGET_LOGO_BYTES = 48 * 1024 // 48 KB alvo para caber leve em banco e e-mails
const PNG_LOSSLESS_FAST_BYTES = 32 * 1024 // PNG pequeno já fica nítido e compacto
const MAX_STORED_LOGO_BYTES = 512 * 1024 // 512 KB limite do servidor

const ALLOWED_RASTER_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp'])
const WEBP_QUALITIES = [0.88, 0.78, 0.66, 0.54] as const
const RETRY_WEBP_QUALITIES = [0.76, 0.62, 0.48] as const

export interface CompressedLogoResult {
  mime: string
  base64: string
  preview: string
  originalBytes: number
  compressedBytes: number
}

export function computeScaledDimensions(
  width: number,
  height: number,
  maxWidth = MAX_LOGO_WIDTH,
  maxHeight = MAX_LOGO_HEIGHT
): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: 1, height: 1 }
  const ratio = Math.min(1, maxWidth / width, maxHeight / height)
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  }
}

export function formatBytesCompact(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Falha ao ler arquivo.'))
    }
    reader.onerror = () => reject(new Error('Falha ao ler arquivo.'))
    reader.readAsDataURL(file)
  })
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Não foi possível decodificar a imagem.'))
    img.src = src
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error(`Falha ao gerar ${mime}.`))
      },
      mime,
      quality
    )
  })
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Falha ao converter imagem.'))
    }
    reader.onerror = () => reject(new Error('Falha ao converter imagem.'))
    reader.readAsDataURL(blob)
  })
}

async function renderToCanvas(
  source: CanvasImageSource,
  width: number,
  height: number
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Contexto 2D indisponível no navegador.')
  ctx.clearRect(0, 0, width, height)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, width, height)
  return canvas
}

async function pickSmallestCandidate(
  canvas: HTMLCanvasElement,
  originalMime: string
): Promise<Blob> {
  // Se for PNG e já ficar bem leve ao redimensionar, preserva lossless
  if (originalMime === 'image/png') {
    const pngBlob = await canvasToBlob(canvas, 'image/png')
    if (pngBlob.size <= PNG_LOSSLESS_FAST_BYTES) {
      return pngBlob
    }
  }

  let bestBlob: Blob | null = null
  for (const quality of WEBP_QUALITIES) {
    const webpBlob = await canvasToBlob(canvas, 'image/webp', quality)
    bestBlob = webpBlob
    if (webpBlob.size <= TARGET_LOGO_BYTES) {
      return webpBlob
    }
  }

  return bestBlob!
}

export async function compressLogoFile(file: File): Promise<CompressedLogoResult> {
  if (file.size === 0 || file.size > MAX_RAW_INPUT_BYTES) {
    throw new Error('Arquivo deve ter entre 1 byte e 10 MB.')
  }

  const mime = file.type.trim().toLowerCase()
  if (mime === 'image/svg+xml') {
    if (file.size > MAX_STORED_LOGO_BYTES) {
      throw new Error('SVG deve ter no máximo 512 KB.')
    }
    const dataUrl = await readFileAsDataUrl(file)
    const base64 = dataUrl.split(',')[1] ?? ''
    if (!base64) throw new Error('Arquivo SVG inválido.')
    return {
      mime,
      base64,
      preview: dataUrl,
      originalBytes: file.size,
      compressedBytes: file.size,
    }
  }

  if (!ALLOWED_RASTER_MIMES.has(mime)) {
    throw new Error('Formato inválido. Use PNG, JPG, WebP ou SVG.')
  }

  const rawDataUrl = await readFileAsDataUrl(file)
  const img = await loadImageElement(rawDataUrl)
  const naturalW = img.naturalWidth || img.width
  const naturalH = img.naturalHeight || img.height

  const firstSize = computeScaledDimensions(naturalW, naturalH, MAX_LOGO_WIDTH, MAX_LOGO_HEIGHT)
  const firstCanvas = await renderToCanvas(img, firstSize.width, firstSize.height)
  let finalBlob = await pickSmallestCandidate(firstCanvas, mime)

  // Segunda passada reduzida caso a imagem ainda passe do alvo
  if (finalBlob.size > TARGET_LOGO_BYTES) {
    const smallerSize = computeScaledDimensions(
      naturalW,
      naturalH,
      Math.round(MAX_LOGO_WIDTH * 0.7),
      Math.round(MAX_LOGO_HEIGHT * 0.7)
    )
    const smallerCanvas = await renderToCanvas(img, smallerSize.width, smallerSize.height)
    for (const quality of RETRY_WEBP_QUALITIES) {
      const candidate = await canvasToBlob(smallerCanvas, 'image/webp', quality)
      finalBlob = candidate
      if (candidate.size <= TARGET_LOGO_BYTES) break
    }
  }

  if (finalBlob.size > MAX_STORED_LOGO_BYTES) {
    throw new Error('Não foi possível comprimir a logo abaixo de 512 KB.')
  }

  const preview = await blobToDataUrl(finalBlob)
  const base64 = preview.split(',')[1] ?? ''
  if (!base64) {
    throw new Error('Falha ao codificar a logo comprimida.')
  }

  return {
    mime: finalBlob.type || 'image/webp',
    base64,
    preview,
    originalBytes: file.size,
    compressedBytes: finalBlob.size,
  }
}
