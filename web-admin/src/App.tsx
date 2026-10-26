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
const W13_StaffCommissions = lazy(() => import('./pages/W13_StaffCommissions').then((m) => ({ default: m.W13_StaffCommissions })));
const W14_ZaloZNS = lazy(() => import('./pages/W14_ZaloZNS').then((m) => ({ default: m.W14_ZaloZNS })));
const W15_InventoryBOM = lazy(() => import('./pages/W15_InventoryBOM').then((m) => ({ default: m.W15_InventoryBOM })));
const W16_Certificates = lazy(() => import('./pages/W16_Certificates').then((m) => ({ default: m.W16_Certificates })));
const W17_EdemaAssessments = lazy(() => import('./pages/W17_EdemaAssessments').then((m) => ({ default: m.W17_EdemaAssessments })));
const W18_PortalContent = lazy(() => import('./pages/W18_PortalContent').then((m) => ({ default: m.W18_PortalContent })));
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

const RoleRoute: React.FC<{ allowedRoles: string[]; children: React.ReactNode }> = ({
  allowedRoles,
  children,
}) => {
  const { user } = useAdmin();
  if (!user) return <Navigate to="/" replace />;
  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="p-8 max-w-lg mx-auto my-12 bg-white rounded-2xl shadow-sm border border-[#EAD8C7] text-center font-['Plus_Jakarta_Sans',sans-serif]">
        <div className="w-14 h-14 mx-auto mb-4 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-700">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-base font-bold text-[#2D1B08] mb-2">Giới hạn quyền truy cập</h2>
        <p className="text-xs text-[#7D6E63] leading-relaxed mb-6">
          Tài khoản với vai trò <span className="font-bold text-[#8A4F23]">{user.role}</span> không có quyền truy cập phân hệ này. Vui lòng liên hệ Quản trị viên cấp cao để được cấp quyền.
        </p>
        <a
          href="/"
          className="inline-flex items-center justify-center px-5 py-2.5 bg-[#8A4F23] text-white text-xs font-semibold rounded-xl hover:bg-[#723F1A] transition-all shadow-sm"
        >
          Quay lại Bảng điều khiển
        </a>
      </div>
    );
  }
  return <>{children}</>;
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
            <Route
              path="cashier-pos"
              element={
                <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'CASHIER', 'RECEPTIONIST']}>
                  <W07_CashierPOS />
                </RoleRoute>
              }
            />
            <Route
              path="invoices"
              element={
                <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'CASHIER', 'RECEPTIONIST']}>
                  <InvoicesRedirect />
                </RoleRoute>
              }
            />
            <Route
              path="receipts"
              element={
                <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'CASHIER', 'RECEPTIONIST']}>
                  <InvoicesRedirect />
                </RoleRoute>
              }
            />
            <Route
              path="hoa-don"
              element={
                <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'CASHIER', 'RECEPTIONIST']}>
                  <InvoicesRedirect />
                </RoleRoute>
              }
            />
            <Route
              path="academy-enrollment"
              element={
                <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'INSTRUCTOR']}>
                  <W08_Enrollment />
                </RoleRoute>
              }
            />
            <Route
              path="instructors"
              element={
                <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'INSTRUCTOR']}>
                  <W09_Instructors />
                </RoleRoute>
              }
            />
            <Route
              path="instructor"
              element={
                <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'INSTRUCTOR']}>
                  <W09_Instructors />
                </RoleRoute>
              }
            />
            <Route
              path="giang-vien"
              element={
                <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'INSTRUCTOR']}>
                  <W09_Instructors />
                </RoleRoute>
              }
            />
            <Route
              path="attendance"
              element={
                <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'INSTRUCTOR']}>
                  <W10_Attendance />
                </RoleRoute>
              }
            />
            <Route
              path="curriculum"
              element={
                <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'INSTRUCTOR']}>
                  <TrainingActions />
                  <W11_Curriculum />
                </RoleRoute>
              }
            />
            <Route
              path="reports"
              element={
                <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER']}>
                  <W12_FinancialReports />
                </RoleRoute>
              }
            />
            <Route
              path="commissions"
              element={
                <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER']}>
                  <W13_StaffCommissions />
                </RoleRoute>
              }
            />
            <Route
              path="staff-commissions"
              element={
                <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER']}>
                  <W13_StaffCommissions />
                </RoleRoute>
              }
            />
            <Route
              path="hoa-hong"
              element={
                <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER']}>
                  <W13_StaffCommissions />
                </RoleRoute>
              }
            />
            <Route
              path="zalo-zns"
              element={
                <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'RECEPTIONIST']}>
                  <W14_ZaloZNS />
                </RoleRoute>
              }
            />
            <Route
              path="crm-zns"
              element={
                <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'RECEPTIONIST']}>
                  <W14_ZaloZNS />
                </RoleRoute>
              }
            />
            <Route
              path="inventory-bom"
              element={
                <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER']}>
                  <W15_InventoryBOM />
                </RoleRoute>
              }
            />
            <Route
              path="dinh-muc-vat-tu"
              element={
                <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER']}>
                  <W15_InventoryBOM />
                </RoleRoute>
              }
            />
            <Route
              path="certificates"
              element={
                <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'INSTRUCTOR']}>
                  <W16_Certificates />
                </RoleRoute>
              }
            />
            <Route
              path="chung-chi"
              element={
                <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'INSTRUCTOR']}>
                  <W16_Certificates />
                </RoleRoute>
              }
            />
            <Route
              path="giay-chung-nhan"
              element={
                <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'INSTRUCTOR']}>
                  <W16_Certificates />
                </RoleRoute>
              }
            />
            <Route
              path="edema-assessments"
              element={
                <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'INSTRUCTOR', 'RECEPTIONIST']}>
                  <W17_EdemaAssessments />
                </RoleRoute>
              }
            />
            <Route
              path="kham-phu"
              element={
                <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'INSTRUCTOR', 'RECEPTIONIST']}>
                  <W17_EdemaAssessments />
                </RoleRoute>
              }
            />
            <Route path="manage/student_certificates" element={<Navigate to="/certificates" replace />} />
            <Route
              path="portal-content"
              element={
                <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'INSTRUCTOR']}>
                  <W18_PortalContent />
                </RoleRoute>
              }
            />
            <Route path="portal" element={<Navigate to="/portal-content" replace />} />
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
