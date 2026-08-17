/**
 * data.ts — In-memory mock dataset for the gRPC UserService lab.
 *
 * 10 users across 3 departments, 3 roles.
 * Special IDs:
 *   "error-not-found"   → triggers Code.NOT_FOUND
 *   "error-permission"  → triggers Code.PERMISSION_DENIED
 *   "error-unavailable" → triggers Code.UNAVAILABLE
 */

// Mirrors the UserRole enum in user.proto (numeric values)
export const UserRoleEnum = {
  UNSPECIFIED: 0,
  ADMIN: 1,
  MEMBER: 2,
  VIEWER: 3,
} as const;

export interface MockUser {
  id: string;
  name: string;
  email: string;
  role: number;
  department: string;
  tags: string[];
}

export const USERS: MockUser[] = [
  {
    id: 'u001',
    name: 'Alice Chen',
    email: 'alice.chen@corp.io',
    role: UserRoleEnum.ADMIN,
    department: 'engineering',
    tags: ['typescript', 'grpc', 'system-design'],
  },
  {
    id: 'u002',
    name: 'Bob Kumar',
    email: 'bob.kumar@corp.io',
    role: UserRoleEnum.MEMBER,
    department: 'engineering',
    tags: ['react', 'node', 'docker'],
  },
  {
    id: 'u003',
    name: 'Clara Osei',
    email: 'clara.osei@corp.io',
    role: UserRoleEnum.MEMBER,
    department: 'engineering',
    tags: ['go', 'kubernetes', 'protobuf'],
  },
  {
    id: 'u004',
    name: 'Dan Rivera',
    email: 'dan.rivera@corp.io',
    role: UserRoleEnum.VIEWER,
    department: 'engineering',
    tags: ['python', 'ml', 'data-pipelines'],
  },
  {
    id: 'u005',
    name: 'Eva Tanaka',
    email: 'eva.tanaka@corp.io',
    role: UserRoleEnum.ADMIN,
    department: 'design',
    tags: ['figma', 'design-systems', 'accessibility'],
  },
  {
    id: 'u006',
    name: 'Frank Ibarra',
    email: 'frank.ibarra@corp.io',
    role: UserRoleEnum.MEMBER,
    department: 'design',
    tags: ['ux', 'prototyping', 'user-research'],
  },
  {
    id: 'u007',
    name: 'Grace Liu',
    email: 'grace.liu@corp.io',
    role: UserRoleEnum.VIEWER,
    department: 'design',
    tags: ['motion', 'interaction', 'figma'],
  },
  {
    id: 'u008',
    name: 'Hiro Patel',
    email: 'hiro.patel@corp.io',
    role: UserRoleEnum.ADMIN,
    department: 'product',
    tags: ['roadmaps', 'okrs', 'jira'],
  },
  {
    id: 'u009',
    name: 'Iris Nwosu',
    email: 'iris.nwosu@corp.io',
    role: UserRoleEnum.MEMBER,
    department: 'product',
    tags: ['analytics', 'a-b-testing', 'sql'],
  },
  {
    id: 'u010',
    name: 'Jake Stein',
    email: 'jake.stein@corp.io',
    role: UserRoleEnum.VIEWER,
    department: 'product',
    tags: ['growth', 'funnels', 'retention'],
  },
];

/** Quick O(1) lookup map */
export const USER_MAP = new Map<string, MockUser>(USERS.map((u) => [u.id, u]));
