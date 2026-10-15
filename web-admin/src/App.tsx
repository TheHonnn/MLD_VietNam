import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
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

export const App: React.FC = () => {
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
          <Route path="services-catalog" element={<W06_TreatmentManagement />} />
          <Route path="cashier-pos" element={<W07_CashierPOS />} />
          <Route path="academy-enrollment" element={<W08_Enrollment />} />
          <Route path="instructors" element={<W09_Instructors />} />
          <Route path="attendance" element={<W10_Attendance />} />
          <Route path="curriculum" element={<W11_Curriculum />} />
          <Route path="reports" element={<W12_FinancialReports />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
