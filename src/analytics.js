export function track(name, data) {
  if (import.meta.env.DEV) console.debug('[umami]', name, data);
  window.umami?.track(name, data);
}

const TOPICS = [
  ['pricing', /\b(price|pricing|cost|free|pay|paid|buy|donat|ko-?fi|licen[cs]e|subscri)/i],
  ['privacy', /\b(privacy|private|personal data|my data|track|telemetry|collect|secur)/i],
  ['troubleshooting', /\b(bug|error|crash|broken|not work|doesn.?t work|won.?t|fail|issue|problem|fix|stuck|wrong|cannot be opened|can.?t be opened)/i],
  ['installation', /\b(install|download|dmg|set ?up|update|upgrade|uninstall|requirement|gatekeeper)/i],
  ['features', /\b(stack|layout|window|snapshot|display|monitor|menu bar|shortcut|hotkey|feature|tile|tiling)/i],
  ['docs', /\b(docs?|documentation|guide|tutorial|readme|how do i|how to)/i],
];

export const topicOf = (q) => TOPICS.find(([, re]) => re.test(q))?.[0] ?? 'other';
