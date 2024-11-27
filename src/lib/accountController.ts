
import {AccountSessionData, ActiveAccountNumber} from './appManagers/utils/currentAccountTypes';
import sessionStorage from './sessionStorage';

export const MAX_ACCOUNTS_FREE = 3;
export const MAX_ACCOUNTS_PREMIUM = 4;

export class AccountController {
  static async getTotalAccounts() {
    const promises = ([1, 2, 3, 4] as const)
    .map(accountNumber => sessionStorage.get(`account${accountNumber}`));

    const allAccountsData = await Promise.all(promises);

    return allAccountsData.filter(accountData => !!accountData?.userId).length;
  }

  static get(accountNumber: ActiveAccountNumber) {
    return sessionStorage.get(`account${accountNumber}`);
  }

  static async update(accountNumber: ActiveAccountNumber, data: Partial<AccountSessionData>) {
    const prevData = await this.get(accountNumber);

    const updatedData = {...prevData, ...data};
    sessionStorage.set({
      [`account${accountNumber}`]: updatedData
    });

    return updatedData;
  }
}

export default AccountController;
