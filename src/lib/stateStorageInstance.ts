import {MOUNT_CLASS_TO} from '../config/debug';
import {getCurrentAccount} from './appManagers/utils/currentAccount';
import {ActiveAccountNumber} from './appManagers/utils/currentAccountTypes';
import StateStorage from './stateStorage';


const currentAccount = getCurrentAccount();

const stateStorage = new StateStorage(currentAccount);
console.log('StateStorage typeof window', typeof window)
MOUNT_CLASS_TO.stateStorage = stateStorage;
export default stateStorage;
