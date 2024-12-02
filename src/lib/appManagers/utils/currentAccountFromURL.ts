import {ActiveAccountNumber, CURRENT_ACCOUNT_QUERY_PARAM} from './currentAccountTypes';

export function getCurrentAccountFromURL(urlString: string) {
  const params = new URL(urlString).searchParams;
  return getValidatedAccount(params.get(CURRENT_ACCOUNT_QUERY_PARAM) || '');
}

export function getValidatedAccount(input: string | number) {
  input = parseInt(input + '');
  return (input <= 4 && input >= 1 ? input : 1) as ActiveAccountNumber;
}
