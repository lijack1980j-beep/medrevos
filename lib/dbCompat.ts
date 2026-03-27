import { prisma } from '@/lib/db';

type Compat = {
  hasBlockedSections: boolean;
  hasTopicAssignments: boolean;
};

let compatPromise: Promise<Compat> | null = null;

async function loadCompat(): Promise<Compat> {
  const rows = await prisma.$queryRaw<Array<{ table_name: string; column_name: string }>>`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (
        (table_name = 'User' AND column_name = 'blockedSections')
        OR
        (table_name = 'Topic' AND column_name = 'assignedToUserId')
      )
  `;

  return {
    hasBlockedSections: rows.some(row => row.table_name === 'User' && row.column_name === 'blockedSections'),
    hasTopicAssignments: rows.some(row => row.table_name === 'Topic' && row.column_name === 'assignedToUserId'),
  };
}

export async function getDbCompat() {
  compatPromise ??= loadCompat();
  return compatPromise;
}

export async function getTopicVisibilityWhere(userId?: string | null) {
  const { hasTopicAssignments } = await getDbCompat();
  if (!hasTopicAssignments) return {};
  if (!userId) return { assignedToUserId: null as string | null };
  return { OR: [{ assignedToUserId: null as string | null }, { assignedToUserId: userId }] };
}

export async function getGlobalTopicWhere() {
  const { hasTopicAssignments } = await getDbCompat();
  return hasTopicAssignments ? { assignedToUserId: null as string | null } : {};
}

export async function getPrivateTopicWhere(userId: string) {
  const { hasTopicAssignments } = await getDbCompat();
  return hasTopicAssignments ? { assignedToUserId: userId } : { id: '__no_private_topics__' };
}

export async function hasBlockedSectionsColumn() {
  return (await getDbCompat()).hasBlockedSections;
}

export async function hasTopicAssignmentsColumn() {
  return (await getDbCompat()).hasTopicAssignments;
}
