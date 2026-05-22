import type { DeepSection } from './interviewPrepData';
import {
  NETWORKING_ESSENTIALS, API_DESIGN, DATA_MODELING,
} from './deep/core1';
import {
  CACHING, SHARDING, CONSISTENT_HASHING,
} from './deep/core2';
import {
  CAP_THEOREM, DATABASE_INDEXING, NUMBERS_TO_KNOW,
} from './deep/core3';

// Topic-id keyed map of hellointerview-style deep content.
// Topic ids must match those in `interviewPrepData.ts`.
export const DEEP_CONTENT: Record<string, DeepSection[]> = {
  'networking-essentials': NETWORKING_ESSENTIALS,
  'api-design':             API_DESIGN,
  'data-modeling':          DATA_MODELING,
  'caching':                CACHING,
  'sharding':               SHARDING,
  'consistent-hashing':     CONSISTENT_HASHING,
  'cap-theorem':            CAP_THEOREM,
  'database-indexing':      DATABASE_INDEXING,
  'numbers-to-know':        NUMBERS_TO_KNOW,
};
