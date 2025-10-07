import middlewarePromise from '../../helpers/middlewarePromise';
import namedPromises from '../../helpers/namedPromises';
import appDialogsManager from '../../lib/appManagers/appDialogsManager';
import {i18n} from '../../lib/langPack';
import rootScope from '../../lib/rootScope';
import {AutonomousMonoforumThreadList} from '../autonomousDialogList/monoforumThreads';
import SortedDialogList from '../sortedDialogList';
import wrapPeerTitle from '../wrappers/peerTitle';
import {ForumTab} from './forumTab';


export class MonoforumTab extends ForumTab {
  private dialogsCountI18nEl: HTMLElement;

  syncInit(): void {
    super.syncInit();


    const autonomousList = new AutonomousMonoforumThreadList({peerId: this.peerId, appDialogsManager});
    autonomousList.scrollable = this.scrollable;
    autonomousList.sortedList = new SortedDialogList({
      itemSize: 72,
      appDialogsManager,
      scrollable: this.scrollable,
      managers: rootScope.managers,
      requestItemForIdx: autonomousList.requestItemForIdx,
      onListShrinked: autonomousList.onListShrinked,
      indexKey: 'index_0',
      monoforumParentPeerId: this.peerId
    });

    const list = autonomousList.sortedList.list;
    this.scrollable.append(list);
    autonomousList.bindScrollable();

    this.xd = autonomousList;

    appDialogsManager.setListClickListener({list, onFound: null, withContext: true});
    this.scrollable.append(list);


    this.listenerSetter.add(rootScope)('dialog_drop', (dialog) => {
      if(dialog.peerId === this.peerId) {
        this._close();
      }
    });

    this.listenerSetter.add(rootScope)('monoforum_dialogs_update', ({dialogs}) => {
      if(!dialogs.find(dialog => dialog.parentPeerId === this.peerId)) return;
      this.updateDialogsCount();
    });

    this.listenerSetter.add(rootScope)('monoforum_dialogs_drop', () => {
      this.updateDialogsCount();
    });
  }

  async asyncInit(): Promise<void> {
    await super.asyncInit();

    const middleware = this.middlewareHelper.get();
    const peerId = this.peerId;

    const wrapPromiseWithMiddleware = middlewarePromise(middleware);

    try {
      const {peerTitle, dialogs} = await wrapPromiseWithMiddleware(namedPromises({
        peerTitle: wrapPeerTitle({
          peerId,
          dialog: true,
          wrapOptions: {middleware}
        }),
        dialogs: this.managers.monoforumDialogsStorage.getDialogs({parentPeerId: peerId, limit: 1})
      }));

      this.title.append(peerTitle);
      this.subtitle.append(this.dialogsCountI18nEl = i18n('ChannelDirectMessages.ThreadsCount', [dialogs ? dialogs.count + '' : '~']))
    } catch{}
  }

  private async updateDialogsCount() {
    if(!this.dialogsCountI18nEl) return;
    const {count} = await this.managers.monoforumDialogsStorage.getDialogs({parentPeerId: this.peerId, limit: 1});
    this.dialogsCountI18nEl.replaceWith(i18n('ChannelDirectMessages.ThreadsCount', [count + '']));
  }
}
