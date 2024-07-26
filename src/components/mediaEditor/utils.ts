import {getOwner, runWithOwner} from 'solid-js'

import {logger} from '../../lib/logger'
import {hexaToHsla} from '../../helpers/color'

import {FontInfo, FontKey} from './types'

export const delay = (timeout: number) => new Promise(resolve => setTimeout(resolve, timeout))

export const log = logger('Media editor')

export function withCurrentOwner<Args extends Array<unknown>, Result>(fn: (...args: Args) => Result) {
  const owner = getOwner()
  return (...args: Args) => {
    return runWithOwner(owner, () => fn(...args))
  }
}

export function getContrastColor(color: string) {
  return hexaToHsla(color).l < 80 ? '#ffffff' : '#000000'
}


export const fontInfoMap: Record<FontKey, FontInfo> = {
  roboto: {
    fontFamily: '\'Roboto\'',
    fontWeight: 500,
    baseline: 0.75
  },
  suez: {
    fontFamily: '\'Suez One\'',
    fontWeight: 400,
    baseline: 0.75
  },
  bubbles: {
    fontFamily: '\'Rubik Bubbles\'',
    fontWeight: 400,
    baseline: 0.75
  },
  playwrite: {
    fontFamily: '\'Playwrite BE VLG\'',
    fontWeight: 400,
    baseline: 0.85
  },
  chewy: {
    fontFamily: '\'Chewy\'',
    fontWeight: 400,
    baseline: 0.75
  },
  courier: {
    fontFamily: '\'Courier Prime\'',
    fontWeight: 700,
    baseline: 0.65
  },
  fugaz: {
    fontFamily: '\'Fugaz One\'',
    fontWeight: 400,
    baseline: 0.75
  },
  sedan: {
    fontFamily: '\'Sedan\'',
    fontWeight: 400,
    baseline: 0.75
  }
}
