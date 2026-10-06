import DOCS from './helper-docs.md?raw'

export const DOC_CHUNKS = DOCS.split(/^(?=#{2,3} )/m).map((s) => s.trim()).filter((s) => s.startsWith('#'))

export const FAQ = [
  {
    q: ['What is cairn?', 'What does cairn do?', 'Tell me about cairn'],
    a: 'Cairn saves your window arrangements as named stacks and restores them with one click from the menu bar.',
  },
  {
    q: ['How do I download cairn?', 'How do I install cairn?', 'Where can I get cairn?'],
    a: 'Download https://github.com/lukesj28/cairn/releases/latest/download/Cairn.dmg and drag Cairn to Applications.',
  },
  {
    q: ['What are the system requirements?', 'Which macOS versions does cairn support?', 'Will cairn run on my Mac?'],
    a: 'Cairn needs macOS 12 or later. It is Mac only.',
  },
  {
    q: ['Is cairn free?', 'How much does cairn cost?', 'Is cairn open source?', 'Do I have to pay for it?'],
    a: 'Yes. Cairn is free and open source under the MIT license. Source: https://github.com/lukesj28/cairn',
  },
  {
    q: ['Why does cairn ask for Accessibility permission?', 'Why does cairn need Accessibility access?', 'What is the permission prompt on first launch?'],
    a: 'Cairn needs Accessibility permission to move and resize windows. It asks for it on first launch.',
  },
  {
    q: ['How does cairn update?', 'Does cairn update automatically?', 'How do I get new versions of cairn?'],
    a: 'Updates are automatic, via Sparkle.',
  },
  {
    q: ['Does cairn work with multiple monitors?', 'Can a stack span two displays?', 'Can I use it with an external display?'],
    a: 'Yes. A stack can span a main and a secondary display. Positions are stored as fractions of the screen, so a layout saved on one monitor still makes sense on another.',
  },
  {
    q: ['Is there a Windows version of cairn?', 'Does cairn work on Linux?', 'Is cairn available for Windows or Linux?'],
    a: 'No. Cairn is Mac only.',
  },
  {
    q: ['Who made cairn?', 'Who created cairn?', 'Who is the author of cairn?', 'Who built this?'],
    a: 'Cairn was created by lukesj28: https://github.com/lukesj28',
  },
]

export const TOPIC = [
  'arranging windows on my Mac',
  'cairn stacks and layouts',
  'snap grid canvas for windows',
  'menu bar app for window management',
  'launching apps into place',
  'capturing my current window layout',
  'who is the developer of cairn',
]

export const CONTEXT =
  'You are the helper on the cairn website. Cairn saves a window arrangement as a named stack, stored as fractions of the screen rather than pixels, so a layout saved on one monitor still makes sense on another. Applying a stack launches whatever is not running, waits for the windows, and tiles everything into place. ' +
  'You can capture the current window layout into a stack, or build one by adding apps manually. Arrange windows on a visual canvas with a 12x8 snap grid; hold Shift to place freely. Apply a stack from the menu bar. A stack can span a main and a secondary display. Requires macOS 12+. Mac only. Free and open source under the MIT license. ' +
  'Install is drag-to-Applications from https://github.com/lukesj28/cairn/releases/latest/download/Cairn.dmg; first launch asks for Accessibility permission; updates are automatic via Sparkle. ' +
  'Cairn was created by lukesj28 (https://github.com/lukesj28). If asked who made, created, or built cairn, answer only "lukesj28"; never give any other name. ' +
  'Answer from the "Documentation excerpts" provided with each question; if they do not cover it, say you are not sure and point to the docs page or the README.'
