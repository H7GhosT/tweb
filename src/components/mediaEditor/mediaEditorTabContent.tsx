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
    const toRight = mediaEditorTabsOrder.indexOf(props.activeTab) > mediaEditorTabsOrder.indexOf(prevTab)
    prevTab = props.activeTab

    const newElement = <div>{props.tabs[props.activeTab]}</div> as HTMLDivElement

    if(toRight) {
      prevElement.classList.add('media-editor-tab-content-exit')
      newElement.classList.add('media-editor-tab-content-enter-right')
      container.append(newElement)
      await doubleRaf()
      prevElement.classList.add('media-editor-tab-content-exit-left')
      newElement.classList.remove('media-editor-tab-content-enter-right')
      await delay(200)
      prevElement.remove()
    } else {
      prevElement.classList.add('media-editor-tab-content-exit')
      newElement.classList.add('media-editor-tab-content-enter-left')
      container.append(newElement)
      await doubleRaf()
      prevElement.classList.add('media-editor-tab-content-exit-right')
      newElement.classList.remove('media-editor-tab-content-enter-left')
      await delay(200)
      prevElement.remove()
    }

    prevElement = newElement
  })

  const initialTab = props.tabs[props.activeTab]

  return (
    <div ref={container} class="media-editor-tab-content">
      <div ref={prevElement}>
        {initialTab}
      </div>
    </div>
  );
}
