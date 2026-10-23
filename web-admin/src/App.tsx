import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Layout } from './components/layout/Layout';
import { AdminAuth, useAdmin } from "./admin/Auth";
import "./admin/admin.css";

// Lazy-loaded code-split modules for peak performance & minimal initial bundle
const LoginPage = lazy(() => import('./admin/LoginPage').then((m) => ({ default: m.LoginPage })));
const TrainingActions = lazy(() => import('./admin/TrainingActions').then((m) => ({ default: m.TrainingActions })));
const W01_Dashboard = lazy(() => import('./pages/W01_Dashboard').then((m) => ({ default: m.W01_Dashboard })));
const W02_Branches = lazy(() => import('./pages/W02_Branches').then((m) => ({ default: m.W02_Branches })));
const W03_Customers = lazy(() => import('./pages/W03_Customers').then((m) => ({ default: m.W03_Customers })));
const W04_CustomerDetail = lazy(() => import('./pages/W04_CustomerDetail').then((m) => ({ default: m.W04_CustomerDetail })));
const W05_StaffSchedule = lazy(() => import('./pages/W05_StaffSchedule').then((m) => ({ default: m.W05_StaffSchedule })));
const W06_TreatmentManagement = lazy(() => import('./pages/W06_TreatmentManagement').then((m) => ({ default: m.W06_TreatmentManagement })));
const W07_CashierPOS = lazy(() => import('./pages/W07_CashierPOS').then((m) => ({ default: m.W07_CashierPOS })));
const W08_Enrollment = lazy(() => import('./pages/W08_Enrollment').then((m) => ({ default: m.W08_Enrollment })));
const W09_Instructors = lazy(() => import('./pages/W09_Instructors').then((m) => ({ default: m.W09_Instructors })));
const W10_Attendance = lazy(() => import('./pages/W10_Attendance').then((m) => ({ default: m.W10_Attendance })));
const W11_Curriculum = lazy(() => import('./pages/W11_Curriculum').then((m) => ({ default: m.W11_Curriculum })));
const W12_FinancialReports = lazy(() => import('./pages/W12_FinancialReports').then((m) => ({ default: m.W12_FinancialReports })));
const ResourcePage = lazy(() => import('./admin/ResourcePage').then((m) => ({ default: m.ResourcePage })));

const PageLoadingFallback: React.FC = () => (
  <div className="min-h-[400px] w-full flex flex-col items-center justify-center p-8 font-['Plus_Jakarta_Sans',sans-serif]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2.5 border-[#D8C4B2] border-t-[#8A4F23] rounded-full animate-spin" />
      <span className="text-xs font-semibold text-[#8A4F23]">Đang tải dữ liệu phân hệ MLD...</span>
    </div>
  </div>
);

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
    return (
      <Suspense fallback={<PageLoadingFallback />}>
        <LoginPage />
      </Suspense>
    );
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoadingFallback />}>
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
      </Suspense>
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
