import {DcAuthKey, DcServerSalt, TrueDcId} from '../../../types';

export type ActiveAccountNumber = 1 | 2 | 3 | 4;
export type AccountSessionData = Record<DcAuthKey, string> & Record<DcServerSalt, string> & {
  auth_key_fingerprint: string;
  userId: PeerId;
  dcId: TrueDcId;
  date: number;
};

export const CURRENT_ACCOUNT_QUERY_PARAM = 'ac';
