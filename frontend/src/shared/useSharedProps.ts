import { usePage } from '@inertiajs/react';

import type { SharedProps } from './types';

export function useSharedProps<PageProps extends object = object>() {
  return usePage<SharedProps & PageProps>().props;
}
