import {i18n} from '../../lib/langPack';
import {NoneToVoidFunction} from '../../types';
import {ButtonIconTsx} from '../buttonIconTsx';

export default function MediaEditorTopbar(props: {
  onClose: NoneToVoidFunction
}) {
  return (
    <div class="media-editor-topbar">
      <ButtonIconTsx icon="cross" onClick={props.onClose} /> {/* TODO: Check if there is not already a back icon */}
      <div class="media-editor-topbar-title">
        {i18n('Edit')}
      </div>
      <div class="media-editor-topbar-history-controls">
        <ButtonIconTsx icon="undo" />
        <ButtonIconTsx icon="redo" />
      </div>
    </div>
  );
}
