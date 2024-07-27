import {useContext} from 'solid-js';

import RangeInput from '../rangeInput';
import Space from '../space';
import MediaEditorContext from '../context';

const ADJUST_TIMEOUT = 400;

export default function AdjustmentsTab() {
  const context = useContext(MediaEditorContext);
  const {adjustments} = context;
  const [, setIsAdjusting] = context.isAdjusting;

  let timeoutId = 0;
  function removeIsAdjusting() {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => {
      setIsAdjusting(false);
    }, ADJUST_TIMEOUT);
  }

  return (
    <>
      <Space amount="16px" />
      {adjustments.map((item) => {
        const [value, setValue] = item.signal;
        return (
          <>
            <RangeInput
              value={value()}
              onChange={(v) => {
                setValue(v);
                setIsAdjusting(true);
                removeIsAdjusting();
              }}
              label={item.label()}
              onChangeFinish={(prevValue, currentValue) => {
                context.pushToHistory({
                  undo() {
                    setValue(prevValue);
                  },
                  redo() {
                    setValue(currentValue);
                  }
                });
              }}
              min={item.to100 ? 0 : -50}
              max={item.to100 ? 100 : 50}
            />
            <Space amount="32px" />
          </>
        );
      })}
    </>
  );
}
