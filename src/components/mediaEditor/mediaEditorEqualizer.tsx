import {useContext} from 'solid-js';

import MediaEditorRangeInput from './mediaEditorRangeInput';
import Space from './Space';
import MediaEditorContext from './context';

export default function MediaEditorEqualizer(props: {}) {
  const {adjustments} = useContext(MediaEditorContext);

  return (
    <>
      <Space amount='16px' />
      {adjustments.map((item, idx, array) => {
        const [value, setValue] = item.signal
        return (
          <>
            <MediaEditorRangeInput
              value={value()}
              onChange={setValue}
              label={item.label()}
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
