import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Star, Target, CheckCircle, Award, Trophy, Users } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const HRAppraisals = () => {
    const { addToast } = useToast();
    const [appraisals, setAppraisals] = useState<any[]>([]);
    const [branchStaff, setBranchStaff] = useState<any[]>([]);
    const [awards, setAwards] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [awardModal, setAwardModal] = useState<{isOpen: boolean, targetStaffId: string | null}>({isOpen: false, targetStaffId: null});
    const [awardTitle, setAwardTitle] = useState('');
    
    // Create Mode
    const [showModal, setShowModal] = useState(false);
    const [staffId, setStaffId] = useState('');
    const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    
    // KPI Builder State
    const [kpis, setKpis] = useState([
        { name: 'Target Achievement', score: 0 },
        { name: 'Punctuality & Attendance', score: 0 },
        { name: 'Professional Conduct', score: 0 },
        { name: 'Client Relationship Management', score: 0 }
    ]);
    const [remarks, setRemarks] = useState('');

    useEffect(() => {
        fetchData();
        fetchBranchStaff();
    }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const [apsRes, awRes] = await Promise.all([
                axios.get('http://localhost:3000/api/hr-workflows/appraisals/branch-appraisals', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('http://localhost:3000/api/hr-workflows/awards', { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setAppraisals(apsRes.data);
            setAwards(awRes.data);
            setLoading(false);
        } catch (error) {
            setLoading(false);
        }
    };

    const fetchBranchStaff = async () => {
        try {
            const token = localStorage.getItem('token');
            const userData = JSON.parse(localStorage.getItem('user') || '{}');
            const coId = userData.companyId || userData.company?.id;
            const brId = userData.branchId || userData.branch?.id;
            
            if (coId && brId) {
                const res = await axios.get(`http://localhost:3000/api/companies/${coId}/branches/${brId}/users`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setBranchStaff(res.data.filter((u: any) => u.role !== 'BRANCH_ADMIN'));
            }
        } catch (error) {}
    };

    const handleKpiChange = (index: number, score: number) => {
        const newKpis = [...kpis];
        newKpis[index].score = score;
        setKpis(newKpis);
    };

    const aggregateOverallScore = () => {
        if(kpis.length === 0) return 0;
        const total = kpis.reduce((acc, curr) => acc + curr.score, 0);
        return (total / (kpis.length * 10)) * 100; // Assuming each KPI is out of 10
    };

    const handlePublishAppraisal = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:3000/api/hr-workflows/appraisals', {
                staffId,
                period,
                score: aggregateOverallScore(),
                remarks,
                kpiData: kpis
            }, { headers: { Authorization: `Bearer ${token}` } });
            
            addToast('Appraisal successfully published!', 'success');
            setShowModal(false);
            fetchData();
        } catch (error) {
            addToast('Failed to publish appraisal', 'error');
        }
    };

    const submitAward = async (e: React.FormEvent) => {
        e.preventDefault();
        const { targetStaffId } = awardModal;
        if(!targetStaffId || !awardTitle) return;
        
        try {
            const token = localStorage.getItem('token');
            const d = new Date();
            await axios.post('http://localhost:3000/api/hr-workflows/awards', {
                staffId: targetStaffId,
                title: awardTitle,
                month: d.getMonth() + 1,
                year: d.getFullYear()
            }, { headers: { Authorization: `Bearer ${token}` } });
            addToast('Award Officially Recorded!', 'success');
            setAwardModal({isOpen: false, targetStaffId: null});
            setAwardTitle('');
            fetchData();
        } catch (error: any) {
            addToast(error.response?.data?.error || 'Failed to issue award', 'error');
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Header & Award Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-purple-50 rounded-lg text-purple-600">
                            <Target size={28} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Performance & Appraisals</h1>
                            <p className="text-gray-500 text-sm">Conduct KPI reviews and declare best-performing staff</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
                    >
                        New Appraisal
                    </button>
                </div>

                {/* Latest Award Widget */}
                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl shadow border border-indigo-500 p-6 flex flex-col justify-center items-center text-white relative overflow-hidden">
                    <Trophy size={80} className="absolute -right-4 -bottom-4 text-white/10" />
                    <Award size={32} className="text-yellow-400 mb-2" />
                    <h3 className="text-lg font-semibold cursor-pointer" onClick={() => addToast("To award someone manually, use the Crown Winner button in the table below.", "info")}>Latest Award</h3>
                    {awards.length > 0 ? (
                        <div className="text-center mt-2">
                            <p className="text-2xl font-bold">{awards[0].staff?.fullName}</p>
                            <p className="text-sm text-indigo-100">{awards[0].title}</p>
                        </div>
                    ) : (
                        <p className="text-sm text-indigo-200 mt-2">No awards issued yet.</p>
                    )}
                </div>
            </div>

            {/* Appraisals Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                    <h2 className="font-semibold text-gray-800 flex items-center"><Users size={18} className="mr-2 text-gray-500"/> All Branch Staff Appraisals</h2>
                </div>

                {loading ? (
                    <div className="p-10 text-center text-gray-500">Loading appraisals...</div>
                ) : appraisals.length === 0 ? (
                    <div className="p-10 text-center text-gray-500">No appraisals found. Create one.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Period</th>
                                    <th className="px-6 py-4 font-medium">Employee</th>
                                    <th className="px-6 py-4 font-medium">Score</th>
                                    <th className="px-6 py-4 font-medium">Remarks</th>
                                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {appraisals.map((app) => (
                                    <tr key={app.id} className="hover:bg-gray-50/50">
                                        <td className="px-6 py-4 text-gray-900 font-medium">{app.period}</td>
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-gray-900">{app.staff?.fullName}</p>
                                            <p className="text-xs text-gray-500">{app.staff?.role?.replace('_', ' ')}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <span className={`text-lg font-bold mr-2 ${app.score >= 80 ? 'text-green-600' : app.score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                    {app.score.toFixed(1)}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 truncate max-w-xs">{app.remarks}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => setAwardModal({isOpen: true, targetStaffId: app.staffId})} className="text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-3 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm">
                                                Crown Winner
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Appraisal Creation Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <form onSubmit={handlePublishAppraisal} className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center"><Target size={20} className="mr-2 text-purple-600"/> Build KPI Appraisal</h3>
                            <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <CheckCircle size={24} className="opacity-0" /> {/* Spacer */}
                                &times;
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-6 overflow-y-auto flex-1">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Target Staff Member</label>
                                    <select required value={staffId} onChange={e => setStaffId(e.target.value)} className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-purple-500 focus:border-purple-500 block p-2.5">
                                        <option value="">-- Select Staff --</option>
                                        {branchStaff.map(s => (
                                            <option key={s.id} value={s.id}>{s.fullName} ({s.role})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Appraisal Period</label>
                                    <input required type="month" value={period} onChange={e => setPeriod(e.target.value)} className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-purple-500 focus:border-purple-500 block p-2.5" />
                                </div>
                            </div>

                            <div className="border bg-purple-50/30 border-purple-100 rounded-xl p-5">
                                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                                    <Star size={16} className="text-yellow-500 mr-2" />
                                    Determine KPI Scores (Out of 10)
                                </h4>
                                <div className="space-y-4">
                                    {kpis.map((kpi, idx) => (
                                        <div key={idx} className="flex justify-between items-center">
                                            <span className="text-sm font-medium text-gray-700">{kpi.name}</span>
                                            <input 
                                                type="number" min="0" max="10" required
                                                value={kpi.score}
                                                onChange={e => handleKpiChange(idx, Number(e.target.value))}
                                                className="w-20 text-center bg-white border border-gray-300 text-gray-900 rounded focus:ring-purple-500 focus:border-purple-500"
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-6 pt-4 border-t border-purple-200 flex justify-between items-center">
                                    <span className="font-bold text-gray-800">Overall Calculated Score:</span>
                                    <span className="text-xl font-bold text-purple-700">{aggregateOverallScore().toFixed(1)}%</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Appraisal Remarks</label>
                                <textarea required rows={3} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Overall feedback and action items..." className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-purple-500 focus:border-purple-500 block p-2.5"></textarea>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3">
                            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:ring-4 focus:ring-purple-300 shadow-sm">
                                Publish Appraisal Result
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Application Award Modal */}
            {awardModal.isOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <form onSubmit={submitAward} className="bg-white rounded-3xl w-full max-w-sm shadow-2xl flex flex-col transform transition-all overflow-hidden relative border border-purple-100">
                        <div className="absolute top-0 right-0 p-5 z-10">
                            <button type="button" onClick={() => { setAwardModal({isOpen: false, targetStaffId: null}); setAwardTitle(''); }} className="text-gray-400 hover:text-gray-700 bg-white/50 rounded-full p-1 transition backdrop-blur-sm">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                        <div className="p-8 text-center bg-gradient-to-br from-purple-50 via-white to-pink-50 relative">
                            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-yellow-500/40 transform -rotate-6">
                                <Trophy size={48} className="text-white" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-2">Crown a Winner</h3>
                            <p className="text-sm text-gray-500 font-medium mb-8">Issue an official recognition award for outstanding performance.</p>
                            
                            <div className="text-left mb-6">
                                <label className="block text-xs uppercase tracking-wider font-bold text-purple-700 mb-2 ml-1">Award Title</label>
                                <input 
                                    required 
                                    autoFocus
                                    type="text" 
                                    value={awardTitle} 
                                    onChange={e => setAwardTitle(e.target.value)} 
                                    placeholder="e.g., Best Marketer - March..." 
                                    className="w-full bg-white border-2 border-purple-100 text-gray-900 rounded-xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 block p-3.5 text-center font-bold placeholder-gray-300 shadow-sm transition-all" 
                                />
                            </div>

                            <button type="submit" className="w-full py-4 text-sm font-black tracking-wide text-white uppercase bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-xl shadow-purple-500/30 rounded-xl transition-all hover:scale-[1.02] active:scale-95">
                                Officially Publish Award
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};
