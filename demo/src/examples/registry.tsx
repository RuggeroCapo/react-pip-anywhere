import type { ComponentType } from 'react';
import ActivityFeed from './ActivityFeed';
import Checklist from './Checklist';
import Dashboard from './Dashboard';

export type ExampleId = 'activity-feed' | 'checklist' | 'dashboard';

export type ExampleMeta = {
  id: ExampleId;
  name: string;
  blurb: string;
  Component: ComponentType;
};

export const EXAMPLES: ExampleMeta[] = [
  {
    id: 'activity-feed',
    name: 'Activity feed',
    blurb: 'Stays live while the tab is hidden. Drawn by hand or by Satori.',
    Component: ActivityFeed,
  },
  {
    id: 'checklist',
    name: 'Checklist',
    blurb: 'Still clickable in the window. Read-only once it becomes a picture.',
    Component: Checklist,
  },
  {
    id: 'dashboard',
    name: 'Stats dashboard',
    blurb: 'A sparkline and live numbers. The best fit for the mobile path.',
    Component: Dashboard,
  },
];
