import React, { useEffect, useMemo, useState } from 'react';
import { collection, collectionGroup, onSnapshot, orderBy, query } from 'firebase/firestore';
import { Filter, MessageSquare } from 'lucide-react';
import { useTeamAccess } from '../../hooks/useTeamAccess';
import {
    buildBoardItems,
    buildTeamBoardColumns,
    filterBoardItems,
    isArchivedBoardItem,
} from '../../utils/team-board';
import {
    buildUserDirectoryMap,
    resolveDirectoryUser,
} from '../../utils/notifications-center';
import { formatEmailPrefix } from '../../utils/permissions';
import logger from '../../utils/logger';
import TeamBoardItemDialog from './TeamBoardItemDialog';
import CollapsibleDoneSection from '../common/CollapsibleDoneSection';
import {
    StandardToolbar,
    StandardToolbarField,
    StandardToolbarSelect,
} from '../common/StandardToolbar';

const TeamBoard = ({
    db,
    user,
    teams = [],
    canAccessAll = false,
    onOpenItem = () => {},
    demoMode = false,
    demoState = null,
}) => {
    const [tasks, setTasks] = useState([]);
    const [issues, setIssues] = useState([]);
    const [userDirectoryMap, setUserDirectoryMap] = useState({});
    const [selectedTeamId, setSelectedTeamId] = useState('');
    const [selectedType, setSelectedType] = useState('All');
    const [selectedStatus, setSelectedStatus] = useState('All');
    const [selectedItem, setSelectedItem] = useState(null);
    const { filterableTeams } = useTeamAccess(user, teams, canAccessAll);

    useEffect(() => {
        if (demoMode) {
            setUserDirectoryMap(buildUserDirectoryMap(demoState?.users || []));
            return undefined;
        }
        if (!db) return undefined;

        const usersQuery = query(
            collection(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'users'),
            orderBy('lastSeen', 'desc')
        );

        return onSnapshot(
            usersQuery,
            (snapshot) => {
                setUserDirectoryMap(buildUserDirectoryMap(
                    snapshot.docs.map((docSnap) => ({ uid: docSnap.id, ...docSnap.data() }))
                ));
            },
            (error) => logger.error('Team board users error:', error)
        );
    }, [db, demoMode, demoState]);

    useEffect(() => {
        if (demoMode) {
            const allowedTeamIds = new Set(filterableTeams.map((team) => team.id));
            setTasks((demoState?.tasks || []).filter((item) => canAccessAll || allowedTeamIds.has(item.teamId)));
            setIssues((demoState?.issues || []).filter((item) => canAccessAll || allowedTeamIds.has(item.teamId)));
            return undefined;
        }
        if (!db) return undefined;
        const allowedTeamIds = new Set(filterableTeams.map((team) => team.id));
        const tasksQuery = query(collectionGroup(db, 'tasks'));
        const issuesQuery = query(collectionGroup(db, 'issues'));

        const unsubTasks = onSnapshot(
            tasksQuery,
            (snapshot) => {
                const items = snapshot.docs
                    .map((docSnap) => ({ id: docSnap.id, path: docSnap.ref.path, ...docSnap.data() }))
                    .filter((item) => canAccessAll || allowedTeamIds.has(item.teamId));
                setTasks(items);
            },
            (error) => logger.error('Team board tasks error:', error)
        );

        const unsubIssues = onSnapshot(
            issuesQuery,
            (snapshot) => {
                const items = snapshot.docs
                    .map((docSnap) => ({ id: docSnap.id, path: docSnap.ref.path, ...docSnap.data() }))
                    .filter((item) => canAccessAll || allowedTeamIds.has(item.teamId));
                setIssues(items);
            },
            (error) => logger.error('Team board issues error:', error)
        );

        return () => {
            unsubTasks();
            unsubIssues();
        };
    }, [db, canAccessAll, filterableTeams, demoMode, demoState]);

    useEffect(() => {
        if (!filterableTeams.length) {
            setSelectedTeamId('');
            return;
        }

        const defaultTeamId = filterableTeams[0]?.id || 'All';
        setSelectedTeamId((current) => (
            current && filterableTeams.some((team) => team.id === current)
                ? current
                : defaultTeamId
        ));
    }, [filterableTeams]);

    const normalizedItems = useMemo(() => buildBoardItems({
        tasks: tasks.map((task) => {
            const assigneeRecord = resolveDirectoryUser(userDirectoryMap, task.assigneeEmail || task.assignee);
            return {
                ...task,
                assigneeEmail: assigneeRecord?.email || task.assigneeEmail || '',
                assignee: task.assignee || formatEmailPrefix(assigneeRecord?.email),
                entityType: 'task',
            };
        }),
        issues: issues.map((issue) => {
            const assigneeRecord = resolveDirectoryUser(userDirectoryMap, issue.assigneeEmail || issue.assignee);
            return {
                ...issue,
                assigneeEmail: assigneeRecord?.email || issue.assigneeEmail || '',
                assignee: issue.assignee || formatEmailPrefix(assigneeRecord?.email),
                entityType: 'issue',
            };
        }),
    }), [tasks, issues, userDirectoryMap]);

    const filteredItems = useMemo(() => filterBoardItems(normalizedItems, {
        teamId: selectedTeamId,
        type: selectedType,
        status: selectedStatus,
    }), [normalizedItems, selectedTeamId, selectedType, selectedStatus]);

    const activeItems = useMemo(
        () => filteredItems.filter((item) => !isArchivedBoardItem(item)),
        [filteredItems]
    );

    const archivedItems = useMemo(
        () => filteredItems.filter((item) => isArchivedBoardItem(item)),
        [filteredItems]
    );

    const activeTeam = useMemo(() => (
        filterableTeams.find((team) => team.id === selectedTeamId)
    ), [filterableTeams, selectedTeamId]);

    const columns = useMemo(() => (
        activeTeam
            ? buildTeamBoardColumns({ team: activeTeam, items: activeItems })
            : []
    ), [activeTeam, activeItems]);

    const archivedColumns = useMemo(() => (
        activeTeam
            ? buildTeamBoardColumns({ team: activeTeam, items: archivedItems })
            : []
    ), [activeTeam, archivedItems]);

    const statusOptions = useMemo(() => (
        Array.from(new Set(normalizedItems.map((item) => item.status).filter(Boolean)))
    ), [normalizedItems]);

    const renderColumns = (columnSet, { archived = false } = {}) => (
        <div className="overflow-x-auto pb-2">
            <div className="flex min-w-max gap-5">
                {columnSet.map((column) => (
                    <section key={`${archived ? 'archived' : 'active'}-${column.memberEmail}`} className={`w-[19rem] flex-shrink-0 rounded-[28px] border border-[color:var(--border-soft)] p-4 shadow-sm ${archived ? 'bg-slate-50/80 opacity-85' : 'bg-[linear-gradient(180deg,#ffffff_0%,#fbfaf8_100%)]'}`}>
                        <header className="mb-4 flex items-center justify-between gap-3">
                            <div>
                                <h3 className="text-base font-semibold text-slate-900">{column.memberName}</h3>
                                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{column.role === 'leader' ? 'Leader' : 'Member'}</p>
                            </div>
                            <span className="rounded-full bg-white px-2.5 py-1 text-xs text-slate-500 shadow-sm">
                                {column.items.length} 張
                            </span>
                        </header>

                        <div className="space-y-3">
                            {column.items.length === 0 ? (
                                <div className="rounded-3xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
                                    {archived ? '目前沒有歸檔卡片' : '目前沒有卡片'}
                                </div>
                            ) : (
                                column.items.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setSelectedItem(item)}
                                        className="block w-full rounded-3xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                                item.type === 'issue'
                                                    ? 'bg-amber-100 text-amber-700'
                                                    : 'bg-blue-100 text-blue-700'
                                            }`}>
                                                {item.type === 'issue' ? '問題' : '任務'}
                                            </span>
                                            <span className="text-xs text-slate-400">{item.dueDate || '未排日期'}</span>
                                        </div>
                                        <p className="mt-3 text-sm font-semibold text-slate-900">{item.title || '未命名卡片'}</p>
                                        <div className="mt-2 text-xs text-slate-500">{item.status || '未設定狀態'}</div>
                                        <div className="mt-2 text-xs text-slate-400">最後編輯 {item.lastEditedLabel || '—'}</div>
                                        <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-400">
                                            <span className="inline-flex items-center gap-1 whitespace-nowrap">
                                                <MessageSquare size={13} />
                                                {item.commentCount || 0} 則留言
                                            </span>
                                            <span className="truncate text-right">
                                                {item.lastCommentPreview || '尚未留言'}
                                            </span>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </section>
                ))}
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col gap-3">
                <StandardToolbar testId="team-board-toolbar">
                    <StandardToolbarField icon={<Filter size={16} />}>
                        <StandardToolbarSelect className="sm:w-32" value={selectedTeamId} onChange={(event) => setSelectedTeamId(event.target.value)}>
                            {filterableTeams.map((team) => (
                                <option key={team.id} value={team.id}>{team.name}</option>
                            ))}
                        </StandardToolbarSelect>
                    </StandardToolbarField>

                    <StandardToolbarField icon={<Filter size={16} />}>
                        <StandardToolbarSelect className="sm:w-28" value={selectedType} onChange={(event) => setSelectedType(event.target.value)}>
                            <option value="All">全部類型</option>
                            <option value="task">任務</option>
                            <option value="issue">問題</option>
                        </StandardToolbarSelect>
                    </StandardToolbarField>

                    <StandardToolbarField icon={<Filter size={16} />}>
                        <StandardToolbarSelect className="sm:w-28" value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)}>
                            <option value="All">全部狀態</option>
                            {statusOptions.map((status) => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </StandardToolbarSelect>
                    </StandardToolbarField>
                </StandardToolbar>
            </div>

            {columns.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-slate-400">
                    目前沒有可顯示的團隊卡片
                </div>
            ) : (
                renderColumns(columns)
            )}
            {archivedItems.length > 0 && (
                <CollapsibleDoneSection title="已歸檔" defaultExpanded={false}>
                    {renderColumns(archivedColumns, { archived: true })}
                </CollapsibleDoneSection>
            )}
            <TeamBoardItemDialog
                isOpen={Boolean(selectedItem)}
                item={selectedItem}
                onClose={() => setSelectedItem(null)}
                onNavigateToItem={onOpenItem}
            />
        </div>
    );
};

export default TeamBoard;
