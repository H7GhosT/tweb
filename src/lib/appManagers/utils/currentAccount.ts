import {getCurrentAccountFromURL} from './currentAccountFromURL';
import {ActiveAccountNumber} from './currentAccountTypes';

export const getCurrentAccount = (() => {
  let result: ActiveAccountNumber;
  return () => result ??= getCurrentAccountFromURL(window.location.href);
})();
