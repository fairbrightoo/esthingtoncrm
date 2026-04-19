import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Landing } from './pages/Landing';

import { Tasks } from './pages/Tasks';

import { DashboardLayout } from './components/DashboardLayout';
import { BulkOnboarding } from './pages/BulkOnboarding';
import { BulkLeadUpload } from './pages/BulkLeadUpload';
import { MyLeads } from './pages/MyLeads';
import { BranchSelection } from './pages/BranchSelection';
import { Login } from './pages/Login';
import { BranchDashboard } from './pages/BranchDashboard';
import { SuperAdminDashboard } from './pages/SuperAdminDashboard';
import { GlobalSettings } from './pages/GlobalSettings';
import { BranchUsers } from './pages/BranchUsers';
import { BranchReports } from './pages/BranchReports';
import { BranchSettings } from './pages/BranchSettings';
import { CallScripts } from './pages/CallScripts';
import { InventoryManager } from './pages/InventoryManager';
import { Campaigns } from './pages/Campaigns';
import { CommunicationTemplates } from './pages/CommunicationTemplates';
import { BranchAttendance } from './pages/BranchAttendance';
import { BranchPayroll } from './pages/BranchPayroll';
import { BranchRequisitions } from './pages/BranchRequisitions';
import { MarketerDashboard } from './pages/MarketerDashboard';
import { CustomerCareDashboard } from './pages/CustomerCareDashboard';
import { ManagingDirectorDashboard } from './pages/ManagingDirectorDashboard';
import { MDOverview } from './pages/MDOverview';
import { AccountantDashboard } from './pages/AccountantDashboard';
import { AccountantOverview } from './pages/AccountantOverview';
import { Announcements } from './pages/Announcements';
import { HREventsDashboard } from './pages/HREventsDashboard';
import { HRSettings } from './pages/HRSettings';
import { HRReports } from './pages/HRReports';
import { EnterpriseReports } from './pages/EnterpriseReports';
import { GlobalUserManagement } from './pages/GlobalUserManagement';
import AIKnowledgeBase from './pages/AIKnowledgeBase';
import { HRLeaveManagement } from './pages/HRLeaveManagement';
import { HRDisciplinary } from './pages/HRDisciplinary';
import { HRAppraisals } from './pages/HRAppraisals';
import { CompanyPolicies } from './pages/CompanyPolicies';
import { StaffSelfService } from './pages/StaffSelfService';
import { HRDashboard } from './pages/HRDashboard';
import { HelpdeskTickets } from './pages/HelpdeskTickets';
import { CommunicationLogs } from './pages/CommunicationLogs';
import { AccountantPayroll } from './pages/AccountantPayroll';
import { AccountantTaxCompliance } from './pages/AccountantTaxCompliance';
import { GMDDashboard } from './pages/GMDDashboard';
import { ExecutiveMemos } from './pages/ExecutiveMemos';

import { useParams } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

const DashboardHome = () => {
    const { user } = useAuth();
    if (user?.role === 'SUPER_ADMIN') return <Navigate to="/admin" replace />;
    if (user?.role === 'GROUP_MANAGING_DIRECTOR') return <GMDDashboard />;
    
    if (user?.branch?.name) {
        const branchSlug = user.branch.name.toLowerCase().replace(/\s+/g, '-');
        return <Navigate to={`/dashboard/${branchSlug}`} replace />;
    }
    
    return <div className="p-10 text-center"><h1>Dashboard Overview</h1><p>Welcome to the command center.</p></div>;
};

const BranchDashboardRouter = () => {
  const { user } = useAuth();
  const { branchName } = useParams();

  if (user?.role === 'HR_MANAGER') {
    return <HRDashboard />;
  }

  if (user?.role === 'MARKETER') {
    return <MarketerDashboard />;
  }

  if (user?.role === 'CUSTOMER_CARE') {
    return <CustomerCareDashboard />;
  }

  if (user?.role === 'MANAGING_DIRECTOR') {
    return <MDOverview />;
  }

  if (user?.role === 'ACCOUNTANT') {
    return <AccountantOverview />;
  }

  return <BranchDashboard />;
};

const SettingsRouter = () => {
  const { user } = useAuth();
  if (user?.role === 'HR_MANAGER') {
    return <HRSettings />;
  }
  return <BranchSettings />;
};

const ReportsRouter = () => {
  const { user } = useAuth();
  if (user?.role === 'HR_MANAGER') {
    return <HRReports />;
  }
  return <BranchReports />;
};

const PayrollRouter = () => {
  const { user } = useAuth();
  if (user?.role === 'ACCOUNTANT') {
    return <AccountantPayroll />;
  }
  return <BranchPayroll />;
};

import { ToastProvider } from './context/ToastContext';
import { useEffect } from 'react';

function App() {
  // DOM Dump logic
  useEffect(() => {
    const dumpInterval = setInterval(() => {
      // Find elements that are fixed and covering the screen
      const fixedStr = Array.from(document.querySelectorAll('*')).filter(el => {
        const style = window.getComputedStyle(el);
        return style.position === 'fixed' || style.position === 'absolute';
      }).map(el => `<${el.tagName.toLowerCase()} class="${el.className}">`).join('\n');

      fetch('http://localhost:3000/api/dom-dump', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dom: document.body.innerHTML, fixedElements: fixedStr })
      }).catch(() => { });
    }, 5000);
    return () => clearInterval(dumpInterval);
  }, []);

  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/select-branch" element={<BranchSelection />} />
            <Route path="/login" element={<Login />} />
            {/* Super Admin Routes */}
            <Route path="/admin" element={<DashboardLayout><SuperAdminDashboard /></DashboardLayout>} />
            <Route path="/admin/onboarding" element={<DashboardLayout><BulkOnboarding /></DashboardLayout>} />
            <Route path="/admin/users" element={<DashboardLayout><GlobalUserManagement /></DashboardLayout>} />
            <Route path="/admin/settings" element={<DashboardLayout><GlobalSettings /></DashboardLayout>} />
            <Route path="/admin/inventory" element={<DashboardLayout><InventoryManager /></DashboardLayout>} />
            <Route path="/admin/announcements" element={<DashboardLayout><Announcements /></DashboardLayout>} />
            <Route path="/admin/reports" element={<DashboardLayout><EnterpriseReports /></DashboardLayout>} />

            <Route path="/dashboard" element={<DashboardLayout><DashboardHome /></DashboardLayout>} />
            <Route path="/dashboard/memos" element={<DashboardLayout><ExecutiveMemos /></DashboardLayout>} />

            {/* Dynamic Branch Routes */}
            <Route path="/dashboard/:branchName" element={<DashboardLayout><BranchDashboardRouter /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/tasks" element={<DashboardLayout><Tasks /></DashboardLayout>} />
            
            <Route path="/dashboard/:branchName/approvals" element={<DashboardLayout><ManagingDirectorDashboard /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/memos" element={<DashboardLayout><ExecutiveMemos /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/disbursements" element={<DashboardLayout><AccountantDashboard /></DashboardLayout>} />

            <Route path="/dashboard/:branchName/onboarding" element={<DashboardLayout><BulkOnboarding /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/leads-import" element={<DashboardLayout><BulkLeadUpload /></DashboardLayout>} />

            <Route path="/dashboard/:branchName/leads" element={<DashboardLayout><MyLeads /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/users" element={<DashboardLayout><BranchUsers /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/requisitions" element={<DashboardLayout><BranchRequisitions /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/disbursements" element={<DashboardLayout><AccountantDashboard /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/reports" element={<DashboardLayout><ReportsRouter /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/scripts" element={<DashboardLayout><CallScripts /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/inventory" element={<DashboardLayout><InventoryManager /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/campaigns" element={<DashboardLayout><Campaigns /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/templates" element={<DashboardLayout><CommunicationTemplates /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/knowledge-base" element={<DashboardLayout><AIKnowledgeBase /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/tickets" element={<DashboardLayout><HelpdeskTickets /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/communications" element={<DashboardLayout><CommunicationLogs /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/announcements" element={<DashboardLayout><Announcements /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/attendance" element={<DashboardLayout><BranchAttendance /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/payroll" element={<DashboardLayout><PayrollRouter /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/taxes" element={<DashboardLayout><AccountantTaxCompliance /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/events" element={<DashboardLayout><HREventsDashboard /></DashboardLayout>} />
            
            <Route path="/dashboard/:branchName/leaves" element={<DashboardLayout><HRLeaveManagement /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/disciplinary" element={<DashboardLayout><HRDisciplinary /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/appraisals" element={<DashboardLayout><HRAppraisals /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/policies" element={<DashboardLayout><CompanyPolicies /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/my-hr" element={<DashboardLayout><StaffSelfService /></DashboardLayout>} />
            
            <Route path="/dashboard/:branchName/settings" element={<DashboardLayout><SettingsRouter /></DashboardLayout>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
