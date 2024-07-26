import {useContext} from 'solid-js';

import RangeInput from '../rangeInput';
import Space from '../space';
import MediaEditorContext from '../context';

export default function AdjustmentsTab() {
  const context = useContext(MediaEditorContext);
  const {adjustments} = context

  return (
    <>
      <Space amount='16px' />
      {adjustments.map((item) => {
        const [value, setValue] = item.signal
        return (
          <>
            <RangeInput
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
