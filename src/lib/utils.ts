import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

import type { ClassValue } from 'clsx'

export const cn = (...inputs: Array<ClassValue>): string => {
  return twMerge(clsx(inputs))
}
