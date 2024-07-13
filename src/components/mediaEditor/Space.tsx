import {JSX, splitProps} from 'solid-js';

export default function Space(inProps: JSX.HTMLAttributes<HTMLDivElement> & {
  amount: string
}) {
  const [props, divProps] = splitProps(inProps, ['amount'])
  return <div {...divProps} style={{'padding-top': props.amount}} />
}
