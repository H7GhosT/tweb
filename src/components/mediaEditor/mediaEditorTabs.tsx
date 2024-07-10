import {ButtonIconTsx} from '../buttonIconTsx';


type ConfigItem = {
  icon: Icon
  key: string
}

const config: ConfigItem[] = [
  {icon: 'equalizer', key: 'equalizer'},
  {icon: 'crop', key: 'crop'},
  {icon: 'text', key: 'text'},
  {icon: 'brush', key: 'brush'},
  {icon: 'smile', key: 'stickers'}
]

export const mediaEditorTabsOrder = config.map(item => item.key)

export default function MediaEditorTabs(props: {
  tab: string
  onTabChange: (value: string) => void
}) {
  let underline: HTMLDivElement
  let container: HTMLDivElement


  const tabs = config.map(item => ({
    ...item,
    element: (
      <div
        class="media-editor-tabs-item"
        classList={{'media-editor-tabs-item-active': props.tab === item.key}}
        onClick={() => onTabClick(item.key)}
      >
        <ButtonIconTsx icon={item.icon} />
      </div>
     ) as HTMLElement
  }))

  function onTabClick(key: string) {
    const target = tabs.find(tab => tab.key === key).element
    const containerBR = container.getBoundingClientRect()
    const targetBR = target.getBoundingClientRect()

    underline.style.setProperty('--left', targetBR.left + targetBR.width / 2 - containerBR.left + 'px')

    props.onTabChange(key)
  }


  return (
    <div ref={container} class="media-editor-tabs">
      {tabs.map(tab => tab.element)}
      <div ref={underline} class="media-editor-tabs-underline" />
    </div>
  )
}
