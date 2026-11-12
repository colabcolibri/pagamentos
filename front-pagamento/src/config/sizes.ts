// Types
export type Size = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl'

export type SizeWidth = Size | 'full'
export type SizeHeight =
  | 320
  | 400
  | 480
  | 560
  | 640
  | 720
  | 800
  | 880
  | 960
  | 'full'
  | 'screen'
  | 'fit'

export type SizeConfig = {
  width?: SizeWidth
  height?: SizeHeight
  maxWidth?: SizeWidth
  maxHeight?: SizeHeight
  minWidth?: SizeWidth
  minHeight?: SizeHeight
}

// Constants
export const WIDTH_SIZES = {
  sm: 'max-w-sm', // 384px
  md: 'max-w-md', // 448px
  lg: 'max-w-lg', // 512px
  xl: 'max-w-xl', // 576px
  '2xl': 'max-w-2xl', // 672px
  '3xl': 'max-w-3xl', // 768px
  '4xl': 'max-w-4xl', // 896px
  '5xl': 'max-w-5xl', // 1024px
  '6xl': 'max-w-6xl', // 1152px
  '7xl': 'max-w-7xl', // 1280px
  full: 'max-w-full',
} as const

// Height sizes in px
export const HEIGHT_SIZES = {
  320: 'h-[320px]',
  400: 'h-[400px]',
  480: 'h-[480px]',
  560: 'h-[560px]',
  640: 'h-[640px]',
  720: 'h-[720px]',
  800: 'h-[800px]',
  880: 'h-[880px]',
  960: 'h-[960px]',
  full: 'h-full',
  screen: 'h-screen',
  fit: 'h-fit',
} as const

export const MIN_WIDTH_SIZES = {
  sm: 'min-w-sm',
  md: 'min-w-md',
  lg: 'min-w-lg',
  xl: 'min-w-xl',
  '2xl': 'min-w-2xl',
  '3xl': 'min-w-3xl',
  '4xl': 'min-w-4xl',
  '5xl': 'min-w-5xl',
  '6xl': 'min-w-6xl',
  '7xl': 'min-w-7xl',
  full: 'min-w-full',
} as const

// Min height sizes in px
export const MIN_HEIGHT_SIZES = {
  320: 'min-h-[320px]',
  400: 'min-h-[400px]',
  480: 'min-h-[480px]',
  560: 'min-h-[560px]',
  640: 'min-h-[640px]',
  720: 'min-h-[720px]',
  800: 'min-h-[800px]',
  880: 'min-h-[880px]',
  960: 'min-h-[960px]',
  full: 'min-h-full',
  screen: 'min-h-screen',
  fit: 'min-h-fit',
} as const

export const MAX_WIDTH_SIZES = {
  ...WIDTH_SIZES,
} as const

export const MAX_HEIGHT_SIZES = {
  ...HEIGHT_SIZES,
} as const
