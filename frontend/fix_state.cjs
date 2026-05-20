const fs = require('fs');
const file = 'src/pages/AccountantDashboard.tsx';
let c = fs.readFileSync(file, 'utf8');

const stateVars = `
    const [activeTab, setActiveTab] = useState<'DISBURSEMENTS' | 'BUDGETS' | 'REFUNDS' | 'PAYMENTS_COMMISSIONS' | 'HISTORY'>('DISBURSEMENTS');
    const [disbursements, setDisbursements] = useState<any[]>([]);
    const [commissions, setCommissions] = useState<any[]>([]);
    const [pendingPayments, setPendingPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, type: 'fund'|'commission', id: string, title: string, message: string}>({isOpen: false, type: 'fund', id: '', title: '', message: ''});
    
    // History State
    const [historyStartDate, setHistoryStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [historyEndDate, setHistoryEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [historyData, setHistoryData] = useState<{payments: any[], commissions: any[], requisitions: any[]}>({payments: [], commissions: [], requisitions: []});
    const [historyLoading, setHistoryLoading] = useState(false);

    const token = localStorage.getItem('token');
`;

c = c.replace(/    const \[activeTab, setActiveTab\][\s\S]*?const token = localStorage\.getItem\('token'\);/, stateVars);

const fetchHistoryFunc = `
    const fetchHistory = async () => {
        try {
            setHistoryLoading(true);
            const [reqRes, commRes, payRes] = await Promise.all([
                axios.get(\`\${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/requisitions\`, { headers: { Authorization: \`Bearer \${token}\` } }),
                axios.get(\`\${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/requisitions/pending-commissions\`, { headers: { Authorization: \`Bearer \${token}\` } }),
                axios.get(\`\${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/payments/pending\`, { headers: { Authorization: \`Bearer \${token}\` } })
            ]);
            
            // Just map existing data for history until backend routes are built
            setHistoryData({
                payments: payRes.data,
                commissions: commRes.data,
                requisitions: reqRes.data.filter((r: any) => r.status === 'DISBURSED')
            });
        } catch (error) {
            console.error("Failed to fetch history.", error);
        } finally {
            setHistoryLoading(false);
        }
    };
    
    useEffect(() => {
        if (activeTab === 'HISTORY') {
            fetchHistory();
        }
    }, [activeTab, historyStartDate, historyEndDate]);
    
    const fetchData = async (isBackground = false) => {`;

c = c.replace(/    const fetchData = async \(isBackground = false\) => \{/, fetchHistoryFunc);

fs.writeFileSync(file, c);
console.log("Fixed state and fetchHistory");
