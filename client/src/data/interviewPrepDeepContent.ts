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
import {
  REAL_TIME_UPDATES, DEALING_WITH_CONTENTION, MULTI_STEP_PROCESSES, SCALING_READS,
} from './deep/patterns1';
import {
  SCALING_WRITES, HANDLING_LARGE_BLOBS, MANAGING_LONG_RUNNING_TASKS,
} from './deep/patterns2';
import {
  REDIS, ELASTICSEARCH, KAFKA, API_GATEWAY,
} from './deep/tech1';
import {
  CASSANDRA, DYNAMODB, POSTGRESQL, FLINK, ZOOKEEPER,
} from './deep/tech2';

// Topic-id keyed map of hellointerview-style deep content.
// Topic ids must match those in `interviewPrepData.ts`.
export const DEEP_CONTENT: Record<string, DeepSection[]> = {
  'networking-essentials':      NETWORKING_ESSENTIALS,
  'api-design':                 API_DESIGN,
  'data-modeling':              DATA_MODELING,
  'caching':                    CACHING,
  'sharding':                   SHARDING,
  'consistent-hashing':         CONSISTENT_HASHING,
  'cap-theorem':                CAP_THEOREM,
  'database-indexing':          DATABASE_INDEXING,
  'numbers-to-know':            NUMBERS_TO_KNOW,
  'real-time-updates':          REAL_TIME_UPDATES,
  'dealing-with-contention':    DEALING_WITH_CONTENTION,
  'multi-step-processes':       MULTI_STEP_PROCESSES,
  'scaling-reads':              SCALING_READS,
  'scaling-writes':             SCALING_WRITES,
  'handling-large-blobs':       HANDLING_LARGE_BLOBS,
  'managing-long-running-tasks': MANAGING_LONG_RUNNING_TASKS,
  'redis':                      REDIS,
  'elasticsearch':              ELASTICSEARCH,
  'kafka':                      KAFKA,
  'api-gateway':                API_GATEWAY,
  'cassandra':                  CASSANDRA,
  'dynamodb':                   DYNAMODB,
  'postgresql':                 POSTGRESQL,
  'flink':                      FLINK,
  'zookeeper':                  ZOOKEEPER,
};
