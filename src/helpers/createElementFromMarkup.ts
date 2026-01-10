import {MOUNT_CLASS_TO} from '../config/debug';


/**
 * @example
 * createElementFromMarkup(`
 *  <div>Hellow</div>
 * `);
 *
 * const {spot} = createElementFromMarkup;
 * // Note the missing paranthesis
 * createElementFromMarkup`
 *   <div class="${variable}">${spot(i18n('YoWassup'))}</div>
 * `;
 */
export default function createElementFromMarkup<T = Element>(markup: string): T;
export default function createElementFromMarkup<T = Element>(markupParts: TemplateStringsArray, ...elements: any[]): T;
export default function createElementFromMarkup<T = Element>(markupParts: string | TemplateStringsArray, ...elements: any[]) {
  const template = document.createElement('template');

  if(typeof markupParts === 'string') {
    const markup = markupParts;
    template.innerHTML = markup.trim();
  } else {
    let markup = ''; // markupParts.join('<span data-spot></span>');
    const spotContents: (Node | string)[] = [];

    for(let i = 0; i < markupParts.length - 1; i++) {
      markup += markupParts[i];
      const el = elements[i];

      if(el instanceof Spot) {
        markup += '<span data-spot></span>';
        spotContents.push(el.content);
      } else {
        markup += el;
      }
    }

    markup += markupParts[markupParts.length - 1] || '';

    template.innerHTML = markup.trim();

    template.content.firstElementChild.querySelectorAll('[data-spot]').forEach((spot, idx) => {
      spot.replaceWith(spotContents[idx]);
    });
  }

  return template.content.firstElementChild as T;
};

class Spot {
  constructor(public content: Node | string) {}
}

function spot(content: Node | string) {
  return new Spot(content);
}

createElementFromMarkup.spot = spot;

MOUNT_CLASS_TO['createElementFromMarkup'] = createElementFromMarkup;

