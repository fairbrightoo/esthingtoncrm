import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { LayoutDashboard, Plus, Users, Shield, UserPlus, X, Edit, Trash2 } from 'lucide-react';

export const DepartmentBuilder = () => {
    const { user, token } = useAuth();
    const { addToast } = useToast();
    
    const [teams, setTeams] = useState<any[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal States
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isManageRosterOpen, setIsManageRosterOpen] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<any>(null);

    // Form States
    const [newTeamData, setNewTeamData] = useState({ name: '', teamLeadId: '', bdmId: '' });
    
    // Roster States
    const [rosterMembers, setRosterMembers] = useState<any[]>([]); // Current team members
    const [rosterMemberIdsToAdd, setRosterMemberIdsToAdd] = useState<string[]>([]);
    const [rosterMemberIdsToRemove, setRosterMemberIdsToRemove] = useState<string[]>([]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch Teams
            const teamsRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/teams`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTeams(teamsRes.data);

            // 2. Fetch Users to find floating Marketers, available Leads and BDMs
            const usersRes = await axios.get(
                `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${user?.companyId}/branches/${user?.branchId}/users`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setAllUsers(usersRes.data);
        } catch (error) {
            console.error("Failed to load department data", error);
            addToast("Failed to load department data", "error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (user?.companyId && user?.branchId) {
            fetchData();
        }
    }, [user, token]);

    // Derived user pools
    const unassignedMarketers = allUsers.filter(u => u.role === 'MARKETER' && !u.teamId);
    const teamLeads = allUsers.filter(u => u.role === 'TEAM_LEAD');
    const bdms = allUsers.filter(u => u.role === 'BDM');

    // Create Team
    const handleCreateTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post(
                `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/teams`,
                newTeamData,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            addToast("Team created successfully!", "success");
            setIsCreateModalOpen(false);
            setNewTeamData({ name: '', teamLeadId: '', bdmId: '' });
            fetchData();
        } catch (error) {
            console.error(error);
            addToast("Failed to create team", "error");
        }
    };

    // Open Roster Modal
    const openManageRoster = async (team: any) => {
        setSelectedTeam(team);
        setRosterMemberIdsToAdd([]);
        setRosterMemberIdsToRemove([]);
        
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/teams/${team.id}/members`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRosterMembers(res.data.filter((m: any) => m.role === 'MARKETER')); // Only manage marketer assignments here
            setIsManageRosterOpen(true);
        } catch (error) {
            addToast("Failed to fetch team members", "error");
        }
    };

    // Save Roster Changes
    const handleSaveRoster = async () => {
        if (!selectedTeam) return;
        try {
            await axios.put(
                `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/teams/${selectedTeam.id}`,
                {
                    memberIdsToAdd: rosterMemberIdsToAdd,
                    memberIdsToRemove: rosterMemberIdsToRemove
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            addToast("Team roster updated!", "success");
            setIsManageRosterOpen(false);
            fetchData();
        } catch (error) {
            console.error(error);
            addToast("Failed to update roster", "error");
        }
    };

    if (isLoading) return <div className="p-6">Loading Department Builder...</div>;

    return (
        <div className="p-6 space-y-6">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Department Builder</h1>
                    <p className="text-gray-500 mt-1">Construct teams and assign leadership roles.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm"
                >
                    <Plus size={20} />
                    <span>Create New Team</span>
                </button>
            </header>

            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Total Teams</p>
                        <p className="text-2xl font-bold text-gray-900">{teams.length}</p>
                    </div>
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center"><LayoutDashboard size={20} /></div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Floating Marketers</p>
                        <p className="text-2xl font-bold text-orange-600">{unassignedMarketers.length}</p>
                    </div>
                    <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center"><Users size={20} /></div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Total Team Leads</p>
                        <p className="text-2xl font-bold text-teal-600">{teamLeads.length}</p>
                    </div>
                    <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center"><Shield size={20} /></div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Total BDMs</p>
                        <p className="text-2xl font-bold text-indigo-600">{bdms.length}</p>
                    </div>
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center"><Shield size={20} /></div>
                </div>
            </div>

            {/* Teams Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {teams.map(team => (
                    <div key={team.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-4 text-white">
                            <h3 className="font-bold text-lg">{team.name}</h3>
                            <p className="text-blue-100 text-xs mt-1">{team._count?.members || 0} Total Members</p>
                        </div>
                        <div className="p-5 flex-1 space-y-4">
                            <div>
                                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Business Dev. Manager</p>
                                <div className="flex items-center text-sm font-medium text-gray-800 bg-gray-50 p-2 rounded border border-gray-100">
                                    {team.bdm ? (
                                        <><Shield size={14} className="text-indigo-500 mr-2" /> {team.bdm.fullName}</>
                                    ) : (
                                        <span className="text-gray-400 italic">No BDM Assigned</span>
                                    )}
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Team Lead</p>
                                <div className="flex items-center text-sm font-medium text-gray-800 bg-gray-50 p-2 rounded border border-gray-100">
                                    {team.teamLead ? (
                                        <><Shield size={14} className="text-teal-500 mr-2" /> {team.teamLead.fullName}</>
                                    ) : (
                                        <span className="text-gray-400 italic">No Team Lead Assigned</span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-100 mt-auto">
                            <button 
                                onClick={() => openManageRoster(team)}
                                className="w-full py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 hover:text-blue-600 font-medium text-sm transition flex items-center justify-center shadow-sm"
                            >
                                <Users size={16} className="mr-2" /> Manage Roster
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create Team Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-5">
                            <h2 className="text-xl font-bold text-gray-900">Create New Team</h2>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleCreateTeam} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Team Name</label>
                                <input 
                                    required 
                                    type="text" 
                                    className="w-full border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                                    value={newTeamData.name} 
                                    onChange={e => setNewTeamData({ ...newTeamData, name: e.target.value })} 
                                    placeholder="e.g. Alpha Squadron"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Assign Team Lead (Optional)</label>
                                <select 
                                    className="w-full border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                                    value={newTeamData.teamLeadId} 
                                    onChange={e => setNewTeamData({ ...newTeamData, teamLeadId: e.target.value })}
                                >
                                    <option value="">-- None --</option>
                                    {teamLeads.map(tl => <option key={tl.id} value={tl.id}>{tl.fullName}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Assign BDM (Optional)</label>
                                <select 
                                    className="w-full border rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                                    value={newTeamData.bdmId} 
                                    onChange={e => setNewTeamData({ ...newTeamData, bdmId: e.target.value })}
                                >
                                    <option value="">-- None --</option>
                                    {bdms.map(bdm => <option key={bdm.id} value={bdm.id}>{bdm.fullName}</option>)}
                                </select>
                            </div>
                            <div className="flex justify-end space-x-3 mt-8">
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancel</button>
                                <button type="submit" className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm">Create Team</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Manage Roster Modal */}
            {isManageRosterOpen && selectedTeam && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Manage Roster: {selectedTeam.name}</h2>
                                <p className="text-sm text-gray-500 mt-1">Assign floating marketers to this team or remove existing ones.</p>
                            </div>
                            <button onClick={() => setIsManageRosterOpen(false)} className="text-gray-400 hover:bg-gray-200 p-2 rounded-full transition"><X size={20} /></button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-2 gap-6 bg-gray-50/50">
                            {/* Current Members Column */}
                            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
                                <div className="bg-gray-100 px-4 py-3 border-b border-gray-200 font-semibold text-gray-700 text-sm flex justify-between">
                                    <span>Current Roster</span>
                                    <span className="bg-white text-xs px-2 py-0.5 rounded-full border">{rosterMembers.length - rosterMemberIdsToRemove.length} Marketers</span>
                                </div>
                                <div className="p-2 space-y-2 overflow-y-auto flex-1 h-64">
                                    {rosterMembers.map(m => {
                                        const isRemoved = rosterMemberIdsToRemove.includes(m.id);
                                        if (isRemoved) return null; // Hide from this list if staging for removal
                                        
                                        return (
                                            <div key={m.id} className="flex justify-between items-center p-2 hover:bg-gray-50 border border-transparent hover:border-gray-100 rounded-lg group transition">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-800">{m.fullName}</p>
                                                    <p className="text-xs text-gray-500">{m.email}</p>
                                                </div>
                                                <button 
                                                    onClick={() => setRosterMemberIdsToRemove([...rosterMemberIdsToRemove, m.id])}
                                                    className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition"
                                                    title="Remove from team"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                    
                                    {/* Show added members optimistically */}
                                    {rosterMemberIdsToAdd.map(id => {
                                        const m = allUsers.find(u => u.id === id);
                                        if (!m) return null;
                                        return (
                                            <div key={m.id} className="flex justify-between items-center p-2 bg-green-50 border border-green-100 rounded-lg">
                                                <div>
                                                    <p className="text-sm font-medium text-green-800">{m.fullName} <span className="text-[10px] bg-green-200 text-green-800 px-1.5 rounded ml-1">New</span></p>
                                                    <p className="text-xs text-green-600">{m.email}</p>
                                                </div>
                                                <button 
                                                    onClick={() => setRosterMemberIdsToAdd(rosterMemberIdsToAdd.filter(addId => addId !== m.id))}
                                                    className="text-gray-400 hover:text-gray-600 p-1"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        );
                                    })}

                                    {rosterMembers.length === 0 && rosterMemberIdsToAdd.length === 0 && (
                                        <p className="text-center text-sm text-gray-400 mt-10">No marketers assigned.</p>
                                    )}
                                </div>
                            </div>

                            {/* Unassigned Column */}
                            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
                                <div className="bg-orange-50 px-4 py-3 border-b border-orange-100 font-semibold text-orange-800 text-sm flex justify-between">
                                    <span>Unassigned Marketers</span>
                                    <span className="bg-white text-xs px-2 py-0.5 rounded-full border border-orange-200">{unassignedMarketers.length - rosterMemberIdsToAdd.length + rosterMemberIdsToRemove.length} Available</span>
                                </div>
                                <div className="p-2 space-y-2 overflow-y-auto flex-1 h-64">
                                    {/* Show members that were just removed from the team here */}
                                    {rosterMemberIdsToRemove.map(id => {
                                        const m = rosterMembers.find(u => u.id === id);
                                        if (!m) return null;
                                        return (
                                            <div key={m.id} className="flex justify-between items-center p-2 bg-red-50 border border-red-100 rounded-lg">
                                                <div>
                                                    <p className="text-sm font-medium text-red-800">{m.fullName} <span className="text-[10px] bg-red-200 text-red-800 px-1.5 rounded ml-1">Removed</span></p>
                                                    <p className="text-xs text-red-600">{m.email}</p>
                                                </div>
                                                <button 
                                                    onClick={() => setRosterMemberIdsToRemove(rosterMemberIdsToRemove.filter(remId => remId !== m.id))}
                                                    className="text-gray-500 hover:text-gray-700 text-xs font-medium bg-white px-2 py-1 rounded shadow-sm"
                                                >
                                                    Undo
                                                </button>
                                            </div>
                                        );
                                    })}

                                    {/* Show naturally unassigned members */}
                                    {unassignedMarketers.map(m => {
                                        if (rosterMemberIdsToAdd.includes(m.id)) return null; // Hide if staging for addition
                                        
                                        return (
                                            <div key={m.id} className="flex justify-between items-center p-2 hover:bg-gray-50 border border-transparent hover:border-gray-100 rounded-lg group transition">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-800">{m.fullName}</p>
                                                    <p className="text-xs text-gray-500">{m.email}</p>
                                                </div>
                                                <button 
                                                    onClick={() => setRosterMemberIdsToAdd([...rosterMemberIdsToAdd, m.id])}
                                                    className="text-blue-600 hover:text-white hover:bg-blue-600 bg-blue-50 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition"
                                                    title="Add to team"
                                                >
                                                    <UserPlus size={16} />
                                                </button>
                                            </div>
                                        );
                                    })}

                                    {unassignedMarketers.length === 0 && rosterMemberIdsToRemove.length === 0 && (
                                        <p className="text-center text-sm text-gray-400 mt-10">No floating marketers available.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-white rounded-b-2xl flex justify-between items-center">
                            <div className="text-sm text-gray-500">
                                {rosterMemberIdsToAdd.length > 0 && <span className="text-green-600 font-medium mr-3">+{rosterMemberIdsToAdd.length} Adding</span>}
                                {rosterMemberIdsToRemove.length > 0 && <span className="text-red-500 font-medium">-{rosterMemberIdsToRemove.length} Removing</span>}
                            </div>
                            <div className="flex space-x-3">
                                <button onClick={() => setIsManageRosterOpen(false)} className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Cancel</button>
                                <button 
                                    onClick={handleSaveRoster} 
                                    className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm flex items-center"
                                    disabled={rosterMemberIdsToAdd.length === 0 && rosterMemberIdsToRemove.length === 0}
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DepartmentBuilder;
