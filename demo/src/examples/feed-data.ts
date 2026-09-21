export type FeedItem = {
  id: string;
  title: string;
  tag: 'NEW' | 'INFO' | 'ALERT';
  meta: string;
  at: number;
};

const EVENTS: { title: string; tag: FeedItem['tag']; meta: string }[] = [
  { title: 'Deploy finished: api-gateway@2.14.0', tag: 'INFO', meta: 'CI/CD' },
  { title: 'New comment on "Q3 roadmap"', tag: 'NEW', meta: 'Priya Shah' },
  { title: 'CPU usage above 85% on worker-3', tag: 'ALERT', meta: 'Monitoring' },
  { title: '3 new followers this hour', tag: 'NEW', meta: 'Social' },
  { title: 'Weekly report is ready to review', tag: 'INFO', meta: 'Reports' },
  { title: 'Payment received from Northwind Traders', tag: 'NEW', meta: 'Billing' },
  { title: 'Certificate for api.example.com expires in 9 days', tag: 'ALERT', meta: 'Security' },
  { title: 'New message from Alex Chen', tag: 'NEW', meta: 'Chat' },
  { title: 'Backup completed successfully', tag: 'INFO', meta: 'Ops' },
  { title: 'Rate limit reached for the mobile client', tag: 'ALERT', meta: 'API' },
];

let counter = 0;

export function makeItem(now: number): FeedItem {
  const index = counter % EVENTS.length;
  const event = EVENTS[index] as (typeof EVENTS)[number];
  counter += 1;
  return {
    id: `${now}-${counter}`,
    title: event.title,
    tag: event.tag,
    meta: event.meta,
    at: now,
  };
}

/** Seeds a plausible backlog so the first frame is not empty. */
export function seedFeed(now: number, count = 12): FeedItem[] {
  return Array.from({ length: count }, (_, index) => ({
    ...makeItem(now - (index + 1) * 90_000),
    at: now - (index + 1) * 90_000,
  }));
}

export function relativeTime(at: number, now: number): string {
  const seconds = Math.max(0, Math.round((now - at) / 1000));
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
}
