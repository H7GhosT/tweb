/*
 * https://github.com/morethanwords/tweb
 * Copyright (C) 2019-2021 Eduard Kuzmenko
 * https://github.com/morethanwords/tweb/blob/master/LICENSE
 */

import type {Database} from '.';
import {ActiveAccountNumber} from '../../lib/appManagers/utils/currentAccountTypes';

export type AccountDatabase = Database<'session' | 'stickerSets' | 'users' | 'chats' | 'messages' | 'dialogs'>;
export type CommonDatabase = Database<'session'>;

export const getCommonDatabaseState = (): Database<'session'> => ({
  name: `tweb-common`,
  version: 7,
  stores: [{
    name: 'session'
  }]
});

export const getDatabaseState = (accountNumber: ActiveAccountNumber): Database<'session' | 'stickerSets' | 'users' | 'chats' | 'messages' | 'dialogs'> => ({
  name: `tweb-account-${accountNumber}`,
  version: 7,
  stores: [{
    name: 'session'
  }, {
    name: 'stickerSets'
  }, {
    name: 'users'
  }, {
    name: 'chats'
  }, {
    name: 'dialogs'
  }, {
    name: 'messages'
  }]
});
