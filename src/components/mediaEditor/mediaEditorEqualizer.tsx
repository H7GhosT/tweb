import {useContext} from 'solid-js';

import MediaEditorRangeInput from './mediaEditorRangeInput';
import Space from './Space';
import MediaEditorContext from './context';

export default function MediaEditorEqualizer(props: {}) {
  const context = useContext(MediaEditorContext);
  const {adjustments} = context

  return (
    <>
      <Space amount='16px' />
      {adjustments.map((item) => {
        const [value, setValue] = item.signal
        return (
          <>
            <MediaEditorRangeInput
              value={value()}
              onChange={setValue}
              label={item.label()}
              onChangeFinish={(prevValue, currentValue) => {
                context.pushToHistory({
                  undo() { setValue(prevValue) },
                  redo() { setValue(currentValue) }
                })
              }}
              min={item.to100 ? 0 : -50}
              max={item.to100 ? 100 : 50}
            />
            <Space amount='32px' />
          </>
        )
      })}
    </>
  )
}
