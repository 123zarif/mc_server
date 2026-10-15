import { db } from '../db.js';
import { config } from '../config.js';

export interface PlayerAuthInfo {
  username: string;
  realname?: string;
  uuid?: string;
  groups: string[];
  isAdmin: boolean;
}

/**
 * Checks if a Minecraft user has admin/operator permissions via LuckPerms tables,
 * with fallback to the configured superadmins list.
 */
export async function checkPlayerPermissions(username: string, playerUuid?: string): Promise<PlayerAuthInfo> {
  const normalizedUser = username.trim().toLowerCase();
  const groups: string[] = [];
  let isAdmin = config.superadmins.includes(normalizedUser);

  if (isAdmin) {
    groups.push('superadmin');
  }

  try {
    // 1. Check primary group from luckperms_players
    let res;
    if (playerUuid) {
      res = await db.query(
        'SELECT primary_group FROM luckperms_players WHERE uuid = $1 OR LOWER(username) = $2 LIMIT 1',
        [playerUuid, normalizedUser]
      );
    } else {
      res = await db.query(
        'SELECT primary_group, uuid FROM luckperms_players WHERE LOWER(username) = $1 LIMIT 1',
        [normalizedUser]
      );
      if (res.rows.length > 0 && res.rows[0].uuid) {
        playerUuid = res.rows[0].uuid;
      }
    }

    if (res && res.rows.length > 0) {
      const primaryGroup = (res.rows[0].primary_group || '').toLowerCase();
      if (primaryGroup) {
        groups.push(primaryGroup);
        if (config.adminGroups.includes(primaryGroup)) {
          isAdmin = true;
        }
      }
    }

    // 2. Check inherited groups and direct permissions from luckperms_user_permissions
    if (playerUuid) {
      const permRes = await db.query(
        "SELECT permission FROM luckperms_user_permissions WHERE uuid = $1 AND value = true AND (permission LIKE 'group.%' OR permission = 'admin' OR permission = 'operator')",
        [playerUuid]
      );

      for (const row of permRes.rows) {
        const perm: string = row.permission.toLowerCase();
        if (perm.startsWith('group.')) {
          const groupName = perm.replace('group.', '');
          if (!groups.includes(groupName)) {
            groups.push(groupName);
          }
          if (config.adminGroups.includes(groupName)) {
            isAdmin = true;
          }
        } else if (perm === 'admin' || perm === 'operator') {
          isAdmin = true;
        }
      }
    }
  } catch (err: any) {
    // If LuckPerms table does not exist yet (error 42P01 in postgres), log softly
    if (err.code === '42P01') {
      console.warn('[LuckPerms] Table not found in PostgreSQL. Using superadmin whitelist fallback.');
    } else {
      console.error('[LuckPerms] Error querying permissions:', err.message);
    }
  }

  return {
    username,
    uuid: playerUuid,
    groups,
    isAdmin
  };
}

