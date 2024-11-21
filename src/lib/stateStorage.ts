/*
 * https://github.com/morethanwords/tweb
 * Copyright (C) 2019-2021 Eduard Kuzmenko
 * https://github.com/morethanwords/tweb/blob/master/LICENSE
 */

import type {ChatSavedPosition} from './appManagers/appImManager';
import type {AppDraftsManager} from './appManagers/appDraftsManager';
import type {State} from '../config/state';
import {LangPackDifference} from '../layer';
import AppStorage from './storage';
import DATABASE_STATE, {getDatabaseState} from '../config/databases/state';
import {ActiveAccountNumber} from './appManagers/utils/currentAccountTypes';

export default class StateStorage extends AppStorage<{
  chatPositions: {
    [peerId_threadId: string]: ChatSavedPosition
  },
  langPack: LangPackDifference,
  drafts: AppDraftsManager['drafts'],
  user_auth: any, // support old webk format
} & State, typeof DATABASE_STATE> {
  constructor(accountNumber: ActiveAccountNumber) {
    super(getDatabaseState(accountNumber), 'session');
  }
}
