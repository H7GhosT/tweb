/*
 * https://github.com/morethanwords/tweb
 * Copyright (C) 2019-2021 Eduard Kuzmenko
 * https://github.com/morethanwords/tweb/blob/master/LICENSE
 */

import type {Chat} from '../../../../layer';
import type {Dialog} from '../../appMessagesManager';
import type {User} from '../../appUsersManager';
import DATABASE_STATE, {getDatabaseState} from '../../../../config/databases/state';
import AppStorage from '../../../storage';
import {ActiveAccountNumber} from '../currentAccountTypes';

export type StoragesStorages = {
  users: AppStorage<Record<UserId, User>, typeof DATABASE_STATE>,
  chats: AppStorage<Record<ChatId, Chat>, typeof DATABASE_STATE>,
  dialogs: AppStorage<Record<PeerId, Dialog>, typeof DATABASE_STATE>
};

export default function createStorages(accountNumber: ActiveAccountNumber) {
  const names: (keyof StoragesStorages)[] = ['users', 'chats', 'dialogs'];
  const storages: StoragesStorages = {} as any;
  for(const name of names) {
    // @ts-ignore
    storages[name] = new AppStorage(getDatabaseState(accountNumber), name);
  }

  console.log('createStorages typeof window', typeof window)

  return storages;
}
