import {getOwner, runWithOwner} from 'solid-js'
import {logger} from '../../lib/logger'

export const delay = (timeout: number) => new Promise(resolve => setTimeout(resolve, timeout))

export const log = logger('Media editor')

export function withCurrentOwner<Args extends Array<unknown>, Result>(fn: (...args: Args) => Result) {
  const owner = getOwner()
  return (...args: Args) => {
    return runWithOwner(owner, () => fn(...args))
  }
}
