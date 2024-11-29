import {getCurrentAccountFromURL} from './currentAccountFromURL';
import {ActiveAccountNumber, CURRENT_ACCOUNT_QUERY_PARAM} from './currentAccountTypes';

// TODO: Memoize
export function getCurrentAccount() {
  // return 2;
  return getCurrentAccountFromURL(window.location.href);
  const params = new URLSearchParams(window.location.search);
  const asInt = parseInt(params.get(CURRENT_ACCOUNT_QUERY_PARAM));
  return (asInt <= 4 && asInt >= 1 ? asInt : 1) as ActiveAccountNumber;
}
