import {logger} from '../../lib/logger'

export const delay = (timeout: number) => new Promise(resolve => setTimeout(resolve, timeout))

export const log = logger('Media editor')
