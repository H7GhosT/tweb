import {LangPackDifference} from '../layer';
import {CommonDatabase, getCommonDatabaseState} from '../config/databases/state';
import {MOUNT_CLASS_TO} from '../config/debug';

import AppStorage from './storage';

class CommonStateStorage extends AppStorage<
  {
    langPack: LangPackDifference;
  },
  CommonDatabase
> {
  constructor() {
    super(getCommonDatabaseState(), 'session');
  }
}

const commonStateStorage = new CommonStateStorage();
MOUNT_CLASS_TO.commonStateStorage = commonStateStorage;
export default commonStateStorage;
