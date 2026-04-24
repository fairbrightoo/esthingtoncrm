import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Building2, MapPin, ArrowRight } from 'lucide-react';

interface Branch {
    id: string;
    name: string;
    address: string;
}

export const BranchSelection = () => {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [companyName, setCompanyName] = useState('Esthington Group');
    const [companyTheme, setCompanyTheme] = useState('#1e293b');
    const [isLoading, setIsLoading] = useState(true);

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const companyId = searchParams.get('companyId');

    useEffect(() => {
        if (companyId) {
            // Fetch company details for branding
            axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies`)
                .then(res => {
                    const company = res.data.find((c: any) => c.id === companyId);
                    if (company) {
                        setCompanyName(company.name);
                        setCompanyTheme(company.themeColor || '#1e293b');
                    }
                })
                .catch(err => console.error("Error fetching company", err));

            // Fetch branches
            axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${companyId}/branches`)
                .then(res => {
                    setBranches(res.data);
                    // If no branches, maybe redirect to login directly? 
                    // For now, let's show empty state or handle normally.
                })
                .catch(err => console.error("Error fetching branches", err))
                .finally(() => setIsLoading(false));
        }
    }, [companyId]);

    const handleSelectBranch = (branch: Branch) => {
        navigate(`/login?companyId=${companyId}&branchId=${branch.id}`);
    };

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div></div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
            <div className="text-center mb-12 space-y-2">
                <div className="inline-block p-4 rounded-full mb-4 shadow-lg" style={{ backgroundColor: companyTheme }}>
                    <Building2 className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">{companyName}</h1>
                <p className="text-lg text-gray-500">Select your branch location</p>
            </div>

            {branches.length === 0 ? (
                <div className="text-center bg-white p-8 rounded-xl shadow-sm border border-gray-200 max-w-md">
                    <p className="text-gray-600 mb-6">No specific branches found for this entity.</p>
                    <button
                        onClick={() => navigate(`/login?companyId=${companyId}`)}
                        className="px-6 py-2 rounded-lg text-white font-medium transition-transform hover:-translate-y-0.5"
                        style={{ backgroundColor: companyTheme }}
                    >
                        Proceed to Login
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
                    {branches.map(branch => (
                        <button
                            key={branch.id}
                            onClick={() => handleSelectBranch(branch)}
                            className="group bg-white p-6 rounded-xl shadow-sm hover:shadow-xl border border-gray-200 transition-all duration-300 text-left flex items-center justify-between hover:-translate-y-1 block w-full"
                        >
                            <div className="flex items-center space-x-4">
                                <div className="bg-gray-100 p-3 rounded-full group-hover:bg-gray-200 transition-colors">
                                    <MapPin className="w-6 h-6 text-gray-600" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800 group-hover:text-gray-900">{branch.name}</h3>
                                    <p className="text-sm text-gray-500 mt-1">{branch.address}</p>
                                </div>
                            </div>
                            <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-gray-600 transform group-hover:translate-x-1 transition-all" />
                        </button>
                    ))}
                </div>
            )}

            <button
                onClick={() => navigate('/')}
                className="mt-12 text-gray-400 hover:text-gray-600 text-sm font-medium transition-colors"
            >
                ← Back to Companies
            </button>
        </div>
    );
};
