import {createEffect, JSX} from 'solid-js'

import {doubleRaf} from '../../helpers/schedulers'

import {delay} from './utils'
import {mediaEditorTabsOrder} from './mediaEditorTabs'

export default function MediaEditorTabContent(props: {
  activeTab: string
  tabs: Record<string, JSX.Element>
}) {
  let container: HTMLDivElement
  let prevElement: HTMLDivElement
  let prevTab = props.activeTab


  createEffect(async() => {
    if(prevTab === props.activeTab) return

    const toRight = mediaEditorTabsOrder.indexOf(props.activeTab) > mediaEditorTabsOrder.indexOf(prevTab)
    prevTab = props.activeTab

    const newElement = <div>{props.tabs[props.activeTab]}</div> as HTMLDivElement

    const cls = (element: HTMLElement, action: 'add' | 'remove', modifier: string) =>
      element.classList[action]('media-editor__tab-content--' + modifier)

    cls(prevElement, 'add', 'exit')

    if(toRight) {
      cls(newElement, 'add', 'go-right')
      container.append(newElement)
      await doubleRaf()
      cls(prevElement, 'add', 'go-left')
      cls(newElement, 'remove', 'go-right')
    } else {
      cls(newElement, 'add', 'go-left')
      container.append(newElement)
      await doubleRaf()
      cls(prevElement, 'add', 'go-right')
      cls(newElement, 'remove', 'go-left')
    }

    await delay(200)
    prevElement.remove()

    prevElement = newElement
  })

  const initialTab = props.tabs[props.activeTab]

  return (
    <div ref={container} class="media-editor__tab-content">
      <div ref={prevElement}>
        {initialTab}
      </div>
    </div>
  );
}
