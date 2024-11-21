import {ActiveAccountNumber, CURRENT_ACCOUNT_QUERY_PARAM} from './currentAccountTypes';

export function getCurrentAccountFromURL(urlString: string) {
  const params = new URL(urlString).searchParams;
  const asInt = parseInt(params.get(CURRENT_ACCOUNT_QUERY_PARAM));
  return (asInt <= 4 && asInt >= 1 ? asInt : 1) as ActiveAccountNumber;
}
