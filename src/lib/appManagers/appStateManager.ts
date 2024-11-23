/*
 * https://github.com/morethanwords/tweb
 * Copyright (C) 2019-2021 Eduard Kuzmenko
 * https://github.com/morethanwords/tweb/blob/master/LICENSE
 */

import type {State} from '../../config/state';
import rootScope from '../rootScope';
import StateStorage from '../stateStorage';
import setDeepProperty, {splitDeepPath} from '../../helpers/object/setDeepProperty';
import MTProtoMessagePort from '../mtproto/mtprotoMessagePort';
import {ActiveAccountNumber} from './utils/currentAccountTypes';
import deferredPromise, {CancellablePromise} from '../../helpers/cancellablePromise';
import {StoragesResults} from './utils/storages/loadStorages';

export type ResetStoragesPromise = CancellablePromise<{
  storages: Set<keyof StoragesResults>,
  callback: () => void
}>;
// Check RootScope
export default class AppStateManager {
  private state: State = {} as any;
  public readonly storage: StateStorage;

  // ! for mtproto worker use only
  public newVersion: string;
  public oldVersion: string;
  public userId: UserId;

  public readonly resetStoragesPromise: ResetStoragesPromise;

  constructor(private accountNumber: ActiveAccountNumber) {
    this.storage = new StateStorage(accountNumber);
    this.resetStoragesPromise = deferredPromise();
  }

  public getState() {
    return Promise.resolve(this.state);
  }

  public setByKey(key: string, value: any) {
    setDeepProperty(this.state, key, value);

    const first = splitDeepPath(key)[0] as keyof State;
    if(first === 'settings') {
      rootScope.dispatchEvent('settings_updated', {key, value, settings: this.state.settings});
    }

    return this.pushToState(first, this.state[first]);
  }

  public pushToState<T extends keyof State>(key: T, value: State[T], direct = true, onlyLocal?: boolean) {
    if(direct) {
      this.state[key] = value;
    }

    return this.setKeyValueToStorage(key, value, onlyLocal);
  }

  public setKeyValueToStorage<T extends keyof State>(key: T, value: State[T] = this.state[key], onlyLocal?: boolean) {
    MTProtoMessagePort.getInstance<false>().invokeVoid('mirror', {
      name: 'state',
      key,
      value,
      accountNumber: this.accountNumber
    });

    return this.storage.set({
      [key]: value
    }, onlyLocal);
  }

  /* public resetState() {
    for(let i in this.state) {
      // @ts-ignore
      this.state[i] = false;
    }
    sessionStorage.set(this.state).then(() => {
      location.reload();
    });
  } */
}
