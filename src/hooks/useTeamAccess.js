import { useMemo } from 'react';
import { checkIsLeader, getTeamLeaders, getLeaderTeamMembers, formatEmailPrefix } from '../utils/permissions';

export const useTeamAccess = (user, teams, canAccessAll) => {
    const isLeader = useMemo(() => checkIsLeader(user, teams), [user, teams]);
    const teamMemberEmails = useMemo(() => getLeaderTeamMembers(user, teams), [user, teams]);
    const isRegularMember = !canAccessAll && !isLeader;

    const userSelectableTeams = useMemo(() => {
        if (canAccessAll) return teams;
        if (!user?.email) return [];
        const userEmail = user.email.toLowerCase();
        return teams.filter(team => {
            const leaders = getTeamLeaders(team).map(l => l.toLowerCase());
            const members = (team.members || []).map(m => m.toLowerCase());
            return leaders.includes(userEmail) || members.includes(userEmail);
        });
    }, [canAccessAll, user, teams]);

    const filterableTeams = useMemo(() => {
        if (canAccessAll) return teams;
        return userSelectableTeams;
    }, [canAccessAll, teams, userSelectableTeams]);

    return { isLeader, teamMemberEmails, isRegularMember, userSelectableTeams, filterableTeams };
};
