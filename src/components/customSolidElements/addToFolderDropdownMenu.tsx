import {createSignal, onCleanup} from 'solid-js';
import {defineSolidElement} from '../../lib/solidjs/solidjsElement';
import OtherComp from './otherComp';

type Props = {
  something: number;
  somethingElse: {
    a: string;
    b: Date;
  }
};

const AddToFolderDropdownMenu = defineSolidElement({
  name: 'add-to-folder-dropdown-menu',
  observedAttributes: ['size', 'something'],
  component: (props: Props, attributes, controls: {someAction: () => void}) => {
    (window as any).globalProps = props;
    const [signal, setSignal] = createSignal('');

    controls.someAction = () => void setSignal('from the action');

    const t = self.setTimeout(() => {
      setSignal('inited');
    }, 3000)
    onCleanup(() => {
      self.clearTimeout(t);
    });

    return (
      <div style="color:black">
        Signal: {signal()} <br/>
        <OtherComp />
        <span style="color:black">
          Something: {props.something || 'nothing'} <br/>
          Something else: {props.somethingElse.a} <br/>
          Something else: {props.somethingElse.b.toISOString()} <br/>
        </span>
        <span style="color:black">
          Size: {attributes.size} <br/>
          Something: {attributes.something} <br/>
        </span>

        <button style="color:black" onClick={() => {
          attributes.size += ' hi';
        }}>Change</button>
        <br />
        <button style="color:black" onClick={() => {
          attributes.size = undefined;
        }}>Remove</button>
      </div>
    );
  }
});

export default AddToFolderDropdownMenu;
