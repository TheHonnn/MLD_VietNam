import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Layout } from './components/layout/Layout';
import { ResourcePage } from "./admin/ResourcePage";
import { AdminAuth, useAdmin } from "./admin/Auth";
import { LoginPage } from "./admin/LoginPage";
import { W01_Dashboard } from './pages/W01_Dashboard';
import { W02_Branches } from './pages/W02_Branches';
import { W03_Customers } from './pages/W03_Customers';
import { W04_CustomerDetail } from './pages/W04_CustomerDetail';
import { W05_StaffSchedule } from './pages/W05_StaffSchedule';
import { W06_TreatmentManagement } from './pages/W06_TreatmentManagement';
import { W07_CashierPOS } from './pages/W07_CashierPOS';
import { W08_Enrollment } from './pages/W08_Enrollment';
import { W09_Instructors } from './pages/W09_Instructors';
import { W10_Attendance } from './pages/W10_Attendance';
import { W11_Curriculum } from './pages/W11_Curriculum';
import { W12_FinancialReports } from './pages/W12_FinancialReports';
import { TrainingActions } from './admin/TrainingActions';
import "./admin/admin.css";

const InvoicesRedirect: React.FC = () => {
  const location = useLocation();
  return <Navigate to={`/cashier-pos${location.search}`} replace />;
};

const AppContent: React.FC = () => {
  const { user, loading } = useAdmin();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F1E8] flex flex-col items-center justify-center p-4 font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="flex flex-col items-center gap-3.5">
          <div className="w-10 h-10 border-3 border-[#D8C4B2] border-t-[#8A4F23] rounded-full animate-spin" />
          <p className="text-xs font-semibold text-[#8A4F23] tracking-wide">
            Đang xác thực phiên làm việc MLD...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<W01_Dashboard />} />
          <Route path="branches" element={<W02_Branches />} />
          <Route path="customers" element={<W03_Customers />} />
          <Route path="customer-detail" element={<W04_CustomerDetail />} />
          <Route path="customers/detail" element={<W04_CustomerDetail />} />
          <Route path="medical-records" element={<W06_TreatmentManagement />} />
          <Route path="treatment-management" element={<W06_TreatmentManagement />} />
          <Route path="staff-schedule" element={<W05_StaffSchedule />} />
          <Route path="technician-schedule" element={<W05_StaffSchedule />} />
          <Route path="services-catalog" element={<Navigate to="/manage/services" replace />} />
          <Route path="cashier-pos" element={<W07_CashierPOS />} />
          <Route path="invoices" element={<InvoicesRedirect />} />
          <Route path="receipts" element={<InvoicesRedirect />} />
          <Route path="hoa-don" element={<InvoicesRedirect />} />
          <Route path="academy-enrollment" element={<W08_Enrollment />} />
          <Route path="instructors" element={<W09_Instructors />} />
          <Route path="instructor" element={<W09_Instructors />} />
          <Route path="giang-vien" element={<W09_Instructors />} />
          <Route path="attendance" element={<W10_Attendance />} />
          <Route path="curriculum" element={<><TrainingActions /><W11_Curriculum /></>} />
          <Route path="reports" element={<W12_FinancialReports />} />
          <Route path="manage/branches" element={<Navigate to="/branches" replace />} />
          <Route path="manage/branch_rooms" element={<Navigate to="/branches?tab=rooms" replace />} />
          <Route path="manage/:table" element={<div className="admin-module"><ResourcePage /></div>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export const App: React.FC = () => {
  return (
    <AdminAuth>
      <AppContent />
    </AdminAuth>
  );
};
