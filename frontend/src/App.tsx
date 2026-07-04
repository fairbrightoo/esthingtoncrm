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
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { BranchDashboard } from './pages/BranchDashboard';
import { SuperAdminDashboard } from './pages/SuperAdminDashboard';
import { GlobalSettings } from './pages/GlobalSettings';
import { BranchUsers } from './pages/BranchUsers';
import { BranchReports } from './pages/BranchReports';
import { BranchSettings } from './pages/BranchSettings';
import { CallScripts } from './pages/CallScripts';
import { InventoryManager } from './pages/InventoryManager';
import { LegacySalesRequests } from './pages/LegacySalesRequests';
import { Campaigns } from './pages/Campaigns';
import { CommunicationTemplates } from './pages/CommunicationTemplates';
import { BranchAttendance } from './pages/BranchAttendance';
import { BranchPayroll } from './pages/BranchPayroll';
import { BranchRequisitions } from './pages/BranchRequisitions';
import { MarketerDashboard } from './pages/MarketerDashboard';
import { MarketerReportsDashboard } from './pages/MarketerReportsDashboard';
import { TeamManagement } from './pages/TeamManagement';
import { TeamComms } from './pages/TeamComms';
import { BDMCommandCenter } from './pages/BDMCommandCenter';
import { DepartmentBuilder } from './pages/DepartmentBuilder';
import { CustomerCareDashboard } from './pages/CustomerCareDashboard';
import { ManagingDirectorDashboard } from './pages/ManagingDirectorDashboard';
import { MDOverview } from './pages/MDOverview';
import { MDStaffAnalytics } from './pages/MDStaffAnalytics';
import { AccountantDashboard } from './pages/AccountantDashboard';
import { AccountantOverview } from './pages/AccountantOverview';
import { Announcements } from './pages/Announcements';
import { HREventsDashboard } from './pages/HREventsDashboard';
import { HRSettings } from './pages/HRSettings';
import { HRReports } from './pages/HRReports';
import { EnterpriseReports } from './pages/EnterpriseReports';
import { GlobalUserManagement } from './pages/GlobalUserManagement';
import { GlobalClientsDatabase } from './pages/GlobalClientsDatabase';
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
import { AccountantSettings } from './pages/AccountantSettings';
import { ReportsDashboard } from './pages/ReportsDashboard';
import { BranchBroadcasts } from './pages/BranchBroadcasts';
import { GMNetwork } from './pages/GMNetwork';
import { GMAdvisoryQueue } from './pages/GMAdvisoryQueue';
import { HRRecommendations } from './pages/HRRecommendations';
import { GMDashboard } from './pages/GMDashboard';
import { GMDDashboard } from './pages/GMDDashboard';
import { GMDStaffAnalytics } from './pages/GMDStaffAnalytics';
import { ExecutiveMemos } from './pages/ExecutiveMemos';
import { SiteExpertDashboard } from './pages/SiteExpertDashboard';
import { SiteInspectionTracking } from './pages/SiteInspectionTracking';
import { ICTOracleDashboard } from './pages/ICTOracleDashboard';
import { MarketingMediaHub } from './pages/MarketingMediaHub';
import { ProductionScriptSharing } from './pages/ProductionScriptSharing';
import { StaffTrainingHub } from './pages/StaffTrainingHub';
import { SocialMediaAnalytics } from './pages/SocialMediaAnalytics';

import { GlobalBroadcasts } from './pages/GlobalBroadcasts';
import { ChairmanExpenses } from './pages/ChairmanExpenses';
import { NoticeArchive } from './pages/NoticeArchive';
import { Kiosk } from './pages/Kiosk';
import { useParams } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

const DashboardHome = () => {
    const { user } = useAuth();
    if (user?.role === 'SUPER_ADMIN') return <Navigate to="/admin" replace />;
    if (user?.role === 'GLOBAL_CHAIRMAN') return <Navigate to="/dashboard/chairman" replace />;
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

  if (user?.role === 'BRANCH_HR') {
    return <HRDashboard />;
  }

  if (user?.role === 'GENERAL_MANAGER') {
    return <GMDashboard />;
  }

  if (user?.role === 'MARKETER' || user?.role === 'TEAM_LEAD' || user?.role === 'BDM' || user?.role === 'HEAD_BDD') {
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

  if (user?.role === 'SITE_EXPERT') {
    return <SiteExpertDashboard />;
  }

  if (user?.role === 'ICT_ORACLE') {
    return <ICTOracleDashboard />;
  }

  return <BranchDashboard />;
};

const SettingsRouter = () => {
  const { user } = useAuth();
  if (user?.role === 'BRANCH_HR') {
    return <HRSettings />;
  }
  return <BranchSettings />;
};

const ReportsRouter = () => {
  const { user } = useAuth();
  if (user?.role === 'BRANCH_HR') {
    return <HRReports />;
  }
  if (['MARKETER', 'SALES_MANAGER', 'TEAM_LEAD', 'BDM', 'HEAD_BDD'].includes(user?.role || '')) {
    return <MarketerReportsDashboard />;
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
import { AutoLogout } from './components/AutoLogout';

function App() {
  // DOM Dump logic
  useEffect(() => {
    const dumpInterval = setInterval(() => {
      // Find elements that are fixed and covering the screen
      const fixedStr = Array.from(document.querySelectorAll('*')).filter(el => {
        const style = window.getComputedStyle(el);
        return style.position === 'fixed' || style.position === 'absolute';
      }).map(el => `<${el.tagName.toLowerCase()} class="${el.className}">`).join('\n');

      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/dom-dump`, {
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
        <AutoLogout />
        <Router>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/select-branch" element={<BranchSelection />} />
            <Route path="/login" element={<Login />} />
            <Route path="/kiosk" element={<Kiosk />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            {/* Super Admin Routes */}
            <Route path="/admin" element={<DashboardLayout><SuperAdminDashboard /></DashboardLayout>} />
            <Route path="/admin/onboarding" element={<DashboardLayout><BulkOnboarding /></DashboardLayout>} />
            <Route path="/admin/users" element={<DashboardLayout><GlobalUserManagement /></DashboardLayout>} />
            <Route path="/admin/global-clients" element={<DashboardLayout><GlobalClientsDatabase /></DashboardLayout>} />
            <Route path="/admin/settings" element={<DashboardLayout><GlobalSettings /></DashboardLayout>} />
            <Route path="/admin/inventory" element={<DashboardLayout><InventoryManager /></DashboardLayout>} />
            <Route path="/admin/legacy-requests" element={<DashboardLayout><LegacySalesRequests /></DashboardLayout>} />
            <Route path="/admin/announcements" element={<DashboardLayout><Announcements /></DashboardLayout>} />
            <Route path="/admin/archive" element={<DashboardLayout><NoticeArchive /></DashboardLayout>} />
            <Route path="/admin/reports" element={<DashboardLayout><EnterpriseReports /></DashboardLayout>} />

            <Route path="/dashboard" element={<DashboardLayout><DashboardHome /></DashboardLayout>} />
            <Route path="/dashboard/approvals" element={<DashboardLayout><ManagingDirectorDashboard /></DashboardLayout>} />
            <Route path="/dashboard/requisitions" element={<DashboardLayout><BranchRequisitions /></DashboardLayout>} />
            <Route path="/dashboard/leaves" element={<DashboardLayout><HRLeaveManagement /></DashboardLayout>} />
            <Route path="/dashboard/staff-analytics" element={<DashboardLayout><GMDStaffAnalytics /></DashboardLayout>} />
            <Route path="/dashboard/memos" element={<DashboardLayout><ExecutiveMemos /></DashboardLayout>} />
            <Route path="/dashboard/archive" element={<DashboardLayout><NoticeArchive /></DashboardLayout>} />
            <Route path="/dashboard/my-leads" element={<DashboardLayout><MyLeads scope="my" /></DashboardLayout>} />
            <Route path="/dashboard/settings" element={<DashboardLayout><GlobalSettings /></DashboardLayout>} />

            {/* Global Chairman Routes */}
            <Route path="/dashboard/chairman" element={<DashboardLayout><SuperAdminDashboard /></DashboardLayout>} />
            <Route path="/dashboard/chairman/crm" element={<DashboardLayout><MyLeads scope="my" /></DashboardLayout>} />
            <Route path="/dashboard/chairman/expenses" element={<DashboardLayout><ChairmanExpenses /></DashboardLayout>} />
            <Route path="/dashboard/chairman/broadcasts" element={<DashboardLayout><GlobalBroadcasts /></DashboardLayout>} />
            <Route path="/dashboard/chairman/archive" element={<DashboardLayout><NoticeArchive /></DashboardLayout>} />
            <Route path="/dashboard/chairman/reports" element={<DashboardLayout><EnterpriseReports /></DashboardLayout>} />
            <Route path="/dashboard/chairman/settings" element={<DashboardLayout><GlobalSettings /></DashboardLayout>} />

            {/* Dynamic Branch Routes */}
            <Route path="/dashboard/:branchName" element={<DashboardLayout><BranchDashboardRouter /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/broadcasts" element={<DashboardLayout><BranchBroadcasts /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/network" element={<DashboardLayout><GMNetwork /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/advisory" element={<DashboardLayout><GMAdvisoryQueue /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/hr-recommendations" element={<DashboardLayout><HRRecommendations /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/tasks" element={<DashboardLayout><Tasks /></DashboardLayout>} />
            
            <Route path="/dashboard/:branchName/approvals" element={<DashboardLayout><ManagingDirectorDashboard /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/staff-analytics" element={<DashboardLayout><MDStaffAnalytics /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/memos" element={<DashboardLayout><ExecutiveMemos /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/disbursements" element={<DashboardLayout><AccountantDashboard /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/archive" element={<DashboardLayout><NoticeArchive /></DashboardLayout>} />

            <Route path="/dashboard/:branchName/onboarding" element={<DashboardLayout><BulkOnboarding /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/leads-import" element={<DashboardLayout><BulkLeadUpload /></DashboardLayout>} />

            <Route path="/dashboard/:branchName/leads" element={<DashboardLayout><MyLeads /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/my-leads" element={<DashboardLayout><MyLeads scope="my" /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/cross-sales" element={<DashboardLayout><MyLeads scope="cross-sales" /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/users" element={<DashboardLayout><BranchUsers /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/requisitions" element={<DashboardLayout><BranchRequisitions /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/disbursements" element={<DashboardLayout><AccountantDashboard /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/reports" element={<DashboardLayout><ReportsRouter /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/scripts" element={<DashboardLayout><CallScripts /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/team" element={<DashboardLayout><TeamManagement /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/team-comms" element={<DashboardLayout><TeamComms /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/command-center" element={<DashboardLayout><BDMCommandCenter /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/department" element={<DashboardLayout><DepartmentBuilder /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/inventory" element={<DashboardLayout><InventoryManager /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/legacy-requests" element={<DashboardLayout><LegacySalesRequests /></DashboardLayout>} />
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
            
            <Route path="/dashboard/:branchName/inspection-tracking" element={<DashboardLayout><SiteInspectionTracking /></DashboardLayout>} />
            
            <Route path="/dashboard/:branchName/media-hub" element={<DashboardLayout><MarketingMediaHub /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/production-scripts" element={<DashboardLayout><ProductionScriptSharing /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/training-hub" element={<DashboardLayout><StaffTrainingHub /></DashboardLayout>} />
            <Route path="/dashboard/:branchName/social-analytics" element={<DashboardLayout><SocialMediaAnalytics /></DashboardLayout>} />

            <Route path="/dashboard/:branchName/settings" element={<DashboardLayout><SettingsRouter /></DashboardLayout>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
