import React from 'react';
import { MDStaffTransferQueue } from '../components/MDStaffTransferQueue';
import { ArrowRightLeft } from 'lucide-react';

export const StaffTransfersPage: React.FC = () => {
    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
                <div>
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                            <ArrowRightLeft size={20} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Staff Transfers & Redeployments</h1>
                            <p className="text-xs text-gray-500 font-medium mt-0.5">
                                Review and approve staff releases, accept incoming branch intakes, and inspect official redeployment letters.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Transfers Queue Component */}
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6">
                <MDStaffTransferQueue />
            </div>
        </div>
    );
};

export default StaffTransfersPage;
