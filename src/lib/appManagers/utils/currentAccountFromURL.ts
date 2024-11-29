import {ActiveAccountNumber, CURRENT_ACCOUNT_QUERY_PARAM} from './currentAccountTypes';

export function getCurrentAccountFromURL(urlString: string) {
  // const params = new URL(urlString).searchParams;
  // const asInt = parseInt(params.get(CURRENT_ACCOUNT_QUERY_PARAM));
  const url = new URL(urlString);
  return getValidatedAccount(url.pathname.split('/')[1]);
}

export function getValidatedAccount(input: string | number) {
  input = parseInt(input + '');
  return (input <= 4 && input >= 1 ? input : 1) as ActiveAccountNumber;
}
