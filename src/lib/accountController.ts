import {MOUNT_CLASS_TO} from '../config/debug';

import {AccountSessionData, ActiveAccountNumber} from './appManagers/utils/currentAccountTypes';
import sessionStorage from './sessionStorage';

export const MAX_ACCOUNTS_FREE = 3;
export const MAX_ACCOUNTS_PREMIUM = 4;
export const MAX_ACCOUNTS = MAX_ACCOUNTS_PREMIUM;

export class AccountController {
  static async getTotalAccounts() {
    const promises = ([1, 2, 3, 4] as const).map((accountNumber) => sessionStorage.get(`account${accountNumber}`));

    const allAccountsData = await Promise.all(promises);

    return allAccountsData.filter((accountData) => !!accountData?.userId).length;
  }

  static get(accountNumber: ActiveAccountNumber) {
    return sessionStorage.get(`account${accountNumber}`);
  }

  static async update(accountNumber: ActiveAccountNumber, data: Partial<AccountSessionData>, overrideAll = false) {
    const prevData = await this.get(accountNumber);

    const updatedData = {
      ...(overrideAll ? {} : prevData),
      ...data
    };

    await sessionStorage.set({
      [`account${accountNumber}`]: updatedData
    });

    return updatedData;
  }

  /**
   * Shifts 4 -> 3, 3 -> 2 ... depending on which account you need to delete
   * @param upTo Account to delete basically
   */
  static async shiftAccounts(upTo: ActiveAccountNumber) {
    for(let i = upTo; i <= MAX_ACCOUNTS; i++) {
      await sessionStorage.delete(`account${i as ActiveAccountNumber}`);
      if(i < MAX_ACCOUNTS) {
        const toMove = await this.get((i + 1) as ActiveAccountNumber);
        toMove?.userId && (await this.update(i as ActiveAccountNumber, toMove, true));
      }
    }
  }
}

MOUNT_CLASS_TO.AccountController = AccountController;

export default AccountController;
