import {MOUNT_CLASS_TO} from '../config/debug';
import {getCurrentAccount} from './appManagers/utils/currentAccount';
import {ActiveAccountNumber} from './appManagers/utils/currentAccountTypes';
import StateStorage from './stateStorage';


// TODO: Create common storage for settings and translations
let currentAccount: ActiveAccountNumber = 1;
try {
  currentAccount = getCurrentAccount();
} catch{}

const stateStorage = new StateStorage(currentAccount);
console.log('StateStorage typeof window', typeof window)
MOUNT_CLASS_TO.stateStorage = stateStorage;
export default stateStorage;
