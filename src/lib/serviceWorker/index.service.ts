/*
 * https://github.com/morethanwords/tweb
 * Copyright (C) 2019-2021 Eduard Kuzmenko
 * https://github.com/morethanwords/tweb/blob/master/LICENSE
 */

import {logger, LogTypes} from '../logger';
import {CACHE_ASSETS_NAME, requestCache} from './cache';
import onStreamFetch, {toggleStreamInUse} from './stream';
import {closeAllNotifications, onPing, onShownNotification} from './push';
import CacheStorageController from '../files/cacheStorage';
import {IS_SAFARI} from '../../environment/userAgent';
import ServiceMessagePort from './serviceMessagePort';
import listenMessagePort from '../../helpers/listenMessagePort';
import {getWindowClients} from '../../helpers/context';
import {MessageSendPort} from '../mtproto/superMessagePort';
import handleDownload from './download';
import onShareFetch, {checkWindowClientForDeferredShare} from './share';
import {onRtmpFetch, onRtmpLeftCall} from './rtmp';
import {onHlsQualityFileFetch} from '../hls/onHlsQualityFileFetch';
import {get500ErrorResponse} from './errors';
import {onHlsStreamFetch} from '../hls/onHlsStreamFetch';
import {onHlsPlaylistFetch} from '../hls/onHlsPlaylistFetch';
import {watchHlsStreamChunksLifetime} from '../hls/fetchAndConcatFileParts';
import {setEnvironment} from '../../environment/utils';

// #if MTPROTO_SW
// import '../mtproto/mtproto.worker';
// #endif

export const log = logger('SW', LogTypes.Error | LogTypes.Debug | LogTypes.Log | LogTypes.Warn, true);
const ctx = self as any as ServiceWorkerGlobalScope;

// #if !MTPROTO_SW
let _mtprotoMessagePort: MessagePort;
export const getMtprotoMessagePort = () => _mtprotoMessagePort;

export const invokeVoidAll: ServiceMessagePort['invokeVoid'] = (...args) => {
  getWindowClients().then((windowClients) => {
    windowClients.forEach((windowClient) => {
      // @ts-ignore
      serviceMessagePort.invokeVoid(...args, windowClient);
    });
  });
};

log('init');

const sendMessagePort = (source: MessageSendPort) => {
  const channel = new MessageChannel();
  serviceMessagePort.attachPort(_mtprotoMessagePort = channel.port1);
  serviceMessagePort.invokeVoid('port', undefined, source, [channel.port2]);
};

const sendMessagePortIfNeeded = (source: MessageSendPort) => {
  if(!connectedWindows.size && !_mtprotoMessagePort) {
    log('sending message port for mtproto');
    sendMessagePort(source);
  }
};

const onWindowConnected = (source: WindowClient) => {
  log('window connected', source.id, 'windows before', connectedWindows.size);

  if(source.frameType === 'none') {
    log.warn('maybe a bugged Safari starting window', source.id);
    return;
  }

  log('windows', Array.from(connectedWindows));
  serviceMessagePort.invokeVoid('hello', undefined, source);
  sendMessagePortIfNeeded(source);
  connectedWindows.set(source.id, source);

  checkWindowClientForDeferredShare(source);
};

export const serviceMessagePort = new ServiceMessagePort<false>();
serviceMessagePort.addMultipleEventsListeners({
  environment: (environment) => {
    setEnvironment(environment);
  },

  notificationsClear: closeAllNotifications,

  toggleStorages: ({enabled, clearWrite}) => {
    CacheStorageController.toggleStorage(enabled, clearWrite);
  },

  pushPing: (payload, source) => {
    onPing(payload, source);
  },

  hello: (payload, source) => {
    onWindowConnected(source as any as WindowClient);
  },

  shownNotification: onShownNotification,
  leaveRtmpCall: onRtmpLeftCall,

  toggleStreamInUse
});

const {
  onDownloadFetch,
  onClosedWindows: onDownloadClosedWindows
} = handleDownload(serviceMessagePort);

// * service worker can be killed, so won't get 'hello' event
getWindowClients().then((windowClients) => {
  log(`got ${windowClients.length} windows from the start`);
  windowClients.forEach((windowClient) => {
    onWindowConnected(windowClient);
  });
});

const connectedWindows: Map<string, WindowClient> = new Map();
(self as any).connectedWindows = connectedWindows;
listenMessagePort(serviceMessagePort, undefined, (source) => {
  log('something has disconnected', source);
  const isWindowClient = source instanceof WindowClient;
  if(!isWindowClient || !connectedWindows.has(source.id)) {
    log.warn('it is not a window');
    return;
  }

  connectedWindows.delete(source.id);
  log('window disconnected, left', connectedWindows.size);
  if(!connectedWindows.size) {
    log.warn('no windows left');

    if(_mtprotoMessagePort) {
      serviceMessagePort.detachPort(_mtprotoMessagePort);
      _mtprotoMessagePort = undefined;
    }

    onDownloadClosedWindows();
  }
});
// #endif

watchHlsStreamChunksLifetime();

const onFetch = (event: FetchEvent): void => {
  if(
    import.meta.env.PROD &&
    !IS_SAFARI &&
    event.request.url.indexOf(location.origin + '/') === 0 &&
    event.request.url.match(/\.(js|css|jpe?g|json|wasm|png|mp3|svg|tgs|ico|woff2?|ttf|webmanifest?)(?:\?.*)?$/)
  ) {
    return event.respondWith(requestCache(event));
  }

  if(import.meta.env.DEV && event.request.url.match(/\.([jt]sx?|s?css)?($|\?)/)) {
    return;
  }

  try {
    // const [, url, scope, params] = /http[:s]+\/\/.*?(\/(.*?)(?:$|\/(.*)$))/.exec(event.request.url) || [];
    const [scope, _params] = event.request.url.split('/').slice(-2);
    const [params, search] = _params.split('?');

    // log.debug('[fetch]', event, event.request.url);

    switch(scope) {
      case 'stream': {
        onStreamFetch(event, params, search);
        break;
      }

      case 'd':
      case 'download': {
        onDownloadFetch(event, params);
        break;
      }

      case 'share': {
        onShareFetch(event, params);
        break;
      }

      case 'ping': {
        event.respondWith(new Response('pong'));
        break;
      }

      case 'rtmp': {
        onRtmpFetch(event, params, search);
        break;
      }

      case 'hls': {
        onHlsPlaylistFetch(event, params, search);
        break;
      }

      case 'hls_quality_file': {
        onHlsQualityFileFetch(event, params, search);
        break;
      }

      case 'hls_stream': {
        onHlsStreamFetch(event, params, search);
        break;
      }

      // default: {
      //   event.respondWith(fetch(event.request));
      //   break;
      // }
    }
  } catch(err) {
    log.error('fetch error', err);
    event.respondWith(get500ErrorResponse());
  }
};

const onChangeState = () => {
  ctx.onfetch = onFetch;
};

ctx.addEventListener('install', (event) => {
  log('installing');
  event.waitUntil(ctx.skipWaiting().then(() => log('skipped waiting'))); // Activate worker immediately
});

ctx.addEventListener('activate', (event) => {
  log('activating', ctx);
  event.waitUntil(ctx.caches.delete(CACHE_ASSETS_NAME).then(() => log('cleared assets cache')));
  event.waitUntil(ctx.clients.claim().then(() => log('claimed clients')));
});

// ctx.onerror = (error) => {
//   log.error('error:', error);
// };

// ctx.onunhandledrejection = (error) => {
//   log.error('onunhandledrejection:', error);
// };

ctx.onoffline = ctx.ononline = onChangeState;

onChangeState();
