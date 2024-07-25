- commit with adding icons - bcc482ec236788d402f94c688c7a09d4c40b6bfc

Search for TODOs

TODO High
- Pressing first time Enter in the text layer does something in the attachment popup (maybe deleting the item itself)
- Resizing the crop area doesn't constrain the other points when you drag one


TODO Medium
- Text layer disable adding new types of elements (bold, italic, pasting some sh**)
- When changing adjustments, redraw the lines (maybe hide them while adjusting)
- Dispose context when deleting items from attachments popup
- Animate the stickers


TODO Low
- Mouse wheel and finger zoom scale in out
- When scaling viewport have a max-width and max-height of media editor to not have it too tall / wide
- Deleting text layers
- Firefox text layer with background when adding new line cursor position is weird
- When typing too much text horizontally all text layers slide left / right
- Grain is per device pixel, but should be per image pixel
- 'Type something...' -> i18n
- Cleanup unused icons



Done
+ For example map texture, when the ratio is close to the canvas ratio the image isn't properly scaled
+ Side handles = Crop/Resize from side
+ Cursor horizontal/vertical/diagonal for resizing, and grab for non-text part of the layer
+ Deleting all content from a line from text layer
+ Optimize drawing with brushes
  + Drawing with blur pen on top of eraser doesn't properly work
  + Drawing with neon after blur brush
+ Change cursor for drawing
+ Include fonts locally
