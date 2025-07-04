import {createEffect, createRoot, JSX} from 'solid-js';
import {createMutable, unwrap} from 'solid-js/store';
import {render} from 'solid-js/web';


type Args<ObservedAttribute extends string, Props, Controls extends Object = {}> = {
  name: string;
  component: CustomElementComponent<ObservedAttribute, Props, Controls>;
  observedAttributes?: ObservedAttribute[];
  shadow?: boolean;
}

type AttributesRecord<ObservedAttribute extends string> = Record<ObservedAttribute, string | undefined | null>;
type MutableStore<T extends Object> = T;

type CustomElementComponent<ObservedAttribute extends string, Props, Controls = {}> =
  (props: MutableStore<Props>, attributes: MutableStore<AttributesRecord<ObservedAttribute>>, controls: Controls) => JSX.Element;

export type DefinedSolidElement<Props extends Object, ObservedAttribute extends string, Controls = {}> = ReturnType<typeof defineSolidElement<Props, ObservedAttribute, Controls>>;

/**
 * Defines an HMR capable custom element with solid-js rendering
 *
 * Best to define in `src/components/customSolidElements` and follow the existing structure to take advantage of Hot Module Replacement
 *
 * @example
 * const MyElement = defineSolidElement({
 *   name: 'my-element',
 *   observedAttributes: ['size', 'something-else'],
 *   // props and attributes are reactive mutable stores, meaning you can also mutate them directly
 *   component: (props: {fancyProp: Date}, attributes, controls: {someAction: () => void}) => {
 *     // component logic in here
 *
 *     // expose some methods to the element
 *     controls.someAction = () => setInternalSignal('to something');
 *     return <>...</>;
 *   }
 * });
 *
 * const el = new MyElement;
 * el.feedProps({fancyProp: new Date});
 *
 * // Append to DOM after feeding the props, unless it relies solely on attributes, or handles undefined props
 * otherElement.append(el);
 *
 * // Can use attributes if you want
 * el.setAttribute('size', '400');
 *
 * // Use internal methods through the `controls` property
 * el.controls.someAction();
 */
export function defineSolidElement<Props extends Object, ObservedAttribute extends string, Controls = {}>({
  name,
  component,
  observedAttributes = [],
  shadow = false
}: Args<ObservedAttribute, Props, Controls>) {
  //
  // When the module is hot replaced
  if(customElements.get(name)) {
    const previousElementClass = customElements.get(name) as typeof elementClass;
    previousElementClass.swapComponentFromHMR(component);
    return previousElementClass;
  }

  let instances: (InstanceType<typeof elementClass>)[];

  if(import.meta.hot) {
    instances = [];
  }

  const className = burgerToPascal(name);

  const elementClass = class extends HTMLElement {
    private mountPoint: ShadowRoot | this;

    private attributesStore: MutableStore<AttributesRecord<ObservedAttribute>>;
    private propsStore: MutableStore<Props>;

    private disposeContent?: () => void;
    private disposeStores?: () => void;

    /**
     * Persist props when the component gets mounted / unmounted and allow initialization before the element
     * is added to the DOM
     */
    private savedProps = {} as Props;

    public readonly controls = {} as Controls;

    /**
     * For HMR
     */
    public static Component = component;

    public static swapComponentFromHMR(newComponent: CustomElementComponent<ObservedAttribute, Props, Controls>) {
      if(import.meta.hot) {
        elementClass.Component = newComponent;
        instances.forEach((instance) => {
          instance?.mount?.();
        });
      }
    }

    static get observedAttributes() {
      return observedAttributes;
    }

    constructor() {
      super();

      this.mountPoint = shadow ? this.attachShadow({mode: 'open'}) : this;
    }

    connectedCallback() {
      this.mount();

      if(import.meta.hot) {
        instances.push(this);
      }
    }

    disconnectedCallback() {
      this.unmount();

      if(import.meta.hot) {
        const idx = instances.indexOf(this);
        if(idx > -1) instances.splice(idx, 1);
      }
    }

    attributeChangedCallback(name: ObservedAttribute, _oldValue: string, newValue: string) {
      this.attributesStore[name] = newValue; // Let's hope this will not trigger infinite loops, as the value are compared before updates
    }

    public feedProps<Full extends boolean = true>(props: Full extends true ? Props : Partial<Props>) {
      if(this.disposeStores) {
        Object.assign(this.propsStore, props);
      } else {
        Object.assign(this.savedProps, props);
      }
    }

    private initStores() {
      createRoot(dispose => {
        this.disposeStores = dispose;

        this.propsStore = createMutable(this.savedProps);
        this.attributesStore = createMutable({} as AttributesRecord<ObservedAttribute>);

        createEffect(() => Object.keys(this.attributesStore).forEach(key => {
          const attributeName = key as ObservedAttribute;
          const value = this.attributesStore[attributeName];

          if(this.getAttribute(attributeName) === this.attributesStore[attributeName]) return;

          if(value === null || value === undefined) {
            this.removeAttribute(attributeName);
          } else {
            this.setAttribute(attributeName, value);
          }
        }));
      });
    }

    private mount() {
      let savedAttributes: AttributesRecord<ObservedAttribute>;

      // can happen only on hmr
      if(this.disposeStores) savedAttributes = unwrap(this.attributesStore);

      this.unmount();
      const ComponentToMount = elementClass.Component;

      this.initStores();
      if(savedAttributes) Object.assign(this.attributesStore, savedAttributes);

      this.disposeContent = createRoot(dispose => {
        render(() => ComponentToMount(this.propsStore, this.attributesStore, this.controls), this.mountPoint);
        return dispose;
      });
    }

    private unmount() {
      this.mountPoint.replaceChildren(); // Don't leave trash in there

      this.disposeContent?.();
      this.disposeStores?.();
      this.disposeStores = this.disposeContent = undefined;
    }

    get [Symbol.toStringTag]() {
      return className;
    }
  }

  customElements.define(name, elementClass);

  return elementClass;
}

function burgerToPascal(str: string) {
  return str
  .split('-')
  .map(part => part.charAt(0).toUpperCase() + part.slice(1))
  .join('');
}
