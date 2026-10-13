import { useState, useEffect, useCallback } from 'react';
import { getGroupMembersFromDB } from '../../service/db';
import userDiscoveryStore from '../../service/UserDiscoveryStore';

/**
 * useCommonGroups Hook
 * Computes common groups data ONCE for the entire page across all users.
 * Maps userId -> Array of group names shared in common.
 */
export const useCommonGroups = () => {
  const [commonGroupsMap, setCommonGroupsMap] = useState(new Map());

  const buildMap = useCallback(async () => {
    let isCancelled = false;
    try {
      const currentUserId = localStorage.getItem('userid');
      const rawMap = localStorage.getItem('chatsMap');
      if (!rawMap) {
        setCommonGroupsMap(new Map());
        return;
      }

      const chatsMap = JSON.parse(rawMap);
      const groupList = Object.values(chatsMap).filter(
        c => c && (c.type === 'group' || c.type === 'classroom' || c.type === 'room' || c.isGroupChat || c.isSpace || c.isClassroom)
      );

      const checkPromises = groupList.map(async (g) => {
        try {
          const members = await getGroupMembersFromDB(g.chatId);
          return { group: g, members: members || [] };
        } catch {
          return { group: g, members: [] };
        }
      });

      const groupResults = await Promise.all(checkPromises);

      const userToGroupsMap = new Map();

      for (const { group, members } of groupResults) {
        const groupName = group.chatName || group.name || group.chatId;
        for (const m of members) {
          const memberId = m?.userId ? String(m.userId) : null;
          if (memberId && memberId !== String(currentUserId)) {
            if (!userToGroupsMap.has(memberId)) {
              userToGroupsMap.set(memberId, new Set());
            }
            userToGroupsMap.get(memberId).add(groupName);
          }
        }
      }

      const finalMap = new Map();
      userToGroupsMap.forEach((groupSet, uId) => {
        finalMap.set(uId, Array.from(groupSet));
      });

      setCommonGroupsMap(finalMap);
    } catch (err) {
      console.error('[useCommonGroups] Error computing common groups:', err);
      setCommonGroupsMap(new Map());
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const run = async () => {
      await buildMap();
    };

    run();

    const unsubscribe = userDiscoveryStore.subscribe(() => {
      if (!isCancelled) {
        buildMap();
      }
    });

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [buildMap]);

  const getCommonGroupsList = useCallback((userId) => {
    if (!userId) return [];
    return commonGroupsMap.get(String(userId)) || [];
  }, [commonGroupsMap]);

  const getCommonGroupsText = useCallback((userId) => {
    const list = getCommonGroupsList(userId);
    const count = list.length;
    if (count === 1) return '1 group in common';
    if (count > 1) return `${count} groups in common`;
    return '';
  }, [getCommonGroupsList]);

  return {
    commonGroupsMap,
    getCommonGroupsList,
    getCommonGroupsText,
  };
};
