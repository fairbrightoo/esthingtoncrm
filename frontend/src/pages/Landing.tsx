import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2 } from 'lucide-react';

interface Company {
    id: string;
    name: string;
    logoUrl?: string;
    themeColor?: string;
}

export const Landing = () => {
    const [companies, setCompanies] = useState<Company[]>([]);
    const { setSelectedCompanyId } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        // Fetch companies
        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies`)
            .then(res => {
                const sortedCompanies = res.data.sort((a: Company, b: Company) => {
                    const order = [
                        'Double King Estate Ltd',
                        'Neft Properties Ltd',
                        'Champions Properties Ltd',
                        'Double Grace',
                        'Top Rank Global Project Ltd',
                        'Esthington Links Ltd'
                    ];
                    return order.indexOf(a.name) - order.indexOf(b.name);
                });
                setCompanies(sortedCompanies);
            })
            .catch(err => {
                console.error('Failed to fetch companies', err);
                // Fallback for dev/demo if backend not running
                setCompanies([
                    { id: '1', name: 'Double King Estate Ltd', themeColor: '#1e3a8a' },
                    { id: '4', name: 'Neft Properties Ltd', themeColor: '#d97706' },
                    { id: '3', name: 'Champions Properties Ltd', themeColor: '#b91c1c' },
                    { id: '2', name: 'Double Grace', themeColor: '#059669' },
                    { id: '5', name: 'Top Rank Global Project Ltd', themeColor: '#7c3aed' },
                    { id: '6', name: 'Esthington Links Ltd', themeColor: '#db2777' },
                ]);
            });
    }, []);

    const handleSelectCompany = (company: Company) => {
        setSelectedCompanyId(company.id);
        navigate(`/select-branch?companyId=${company.id}`);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 flex flex-col items-center justify-center p-6">
            <div className="text-center mb-16 space-y-4">
                <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight">Esthington Group OS</h1>
                <h2 className="text-2xl font-semibold text-gray-700">Enterprise Real Estate Operating System</h2>
                <p className="text-xl text-gray-500 font-light">Select your organization to initialize the workspace</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl w-full px-4">
                {companies.map(company => (
                    <button
                        key={company.id}
                        onClick={() => handleSelectCompany(company)}
                        className="group relative overflow-hidden rounded-2xl shadow-sm hover:shadow-2xl transition-all duration-300 h-72 flex flex-col items-center justify-center bg-white border border-gray-100 hover:-translate-y-1 transform"
                        style={{ borderTop: `6px solid ${company.themeColor || '#000'}` }}
                    >
                        <div className="relative z-10 flex flex-col items-center">
                            <div className="bg-gray-50 p-6 rounded-full mb-6 group-hover:scale-110 transition-transform duration-300 shadow-inner group-hover:shadow-md">
                                {/* Placeholder Icon if no logo */}
                                <Building2 className="w-10 h-10 text-gray-700" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-800 px-6 text-center group-hover:text-gray-900 transition-colors">{company.name}</h3>
                        </div>

                        {/* Hover effect overlay */}
                        <div
                            className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none"
                            style={{ backgroundColor: company.themeColor || '#000' }}
                        />
                    </button>
                ))}
            </div>
            <div className="mt-16 text-center space-x-6">
                <button
                    onClick={() => navigate('/login?admin=true')}
                    className="text-sm font-semibold text-gray-500 hover:text-gray-800 underline decoration-dotted underline-offset-4 transition-colors"
                >
                    Super Admin Login
                </button>
                <span className="text-gray-300">|</span>
                <button
                    onClick={() => navigate('/login?admin=true')}
                    className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 underline decoration-dotted underline-offset-4 transition-colors"
                >
                    Global Chairman Login
                </button>
            </div>
        </div>
    );
};
