import {MOUNT_CLASS_TO} from '../config/debug';
import {getCurrentAccount} from './appManagers/utils/currentAccount';
import StateStorage from './stateStorage';


const stateStorage = new StateStorage(getCurrentAccount());
console.log('StateStorage typeof window', typeof window)
MOUNT_CLASS_TO.stateStorage = stateStorage;
export default stateStorage;
