import {useContext} from 'solid-js';

import {i18n} from '../../lib/langPack';
import {NoneToVoidFunction} from '../../types';
import {ButtonIconTsx} from '../buttonIconTsx';

import MediaEditorContext from './context';

export default function Topbar(props: {onClose: NoneToVoidFunction}) {
  const context = useContext(MediaEditorContext);
  const [history, setHistory] = context.history;
  const [redoHistory, setRedoHistory] = context.redoHistory;

  function onUndo() {
    if(!history().length) return;
    const item = history()[history().length - 1];
    setRedoHistory((prev) => [...prev, item]);
    setHistory((prev) => {
      prev.pop();
      return [...prev];
    });
    item.undo();
  }

  function onRedo() {
    if(!redoHistory().length) return;
    const item = redoHistory()[redoHistory().length - 1];
    setHistory((prev) => [...prev, item]);
    setRedoHistory((prev) => {
      prev.pop();
      return [...prev];
    });
    item.redo();
  }

  return (
    <div class="media-editor__topbar">
      <ButtonIconTsx icon="cross" onClick={props.onClose} />
      <div class="media-editor__topbar-title">{i18n('Edit')}</div>
      <div class="media-editor__topbar-history-controls">
        <ButtonIconTsx disabled={!history().length} onClick={onUndo} icon="undo" />
        <ButtonIconTsx disabled={!redoHistory().length} onClick={onRedo} icon="redo" />
      </div>
    </div>
  );
}
