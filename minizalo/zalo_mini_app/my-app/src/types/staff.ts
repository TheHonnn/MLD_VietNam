export type CustomerSection='appointments'|'treatments'|'packages'|'payments'|'care-notes'|'contact';
export interface StaffDashboard {
  profile:{employeeCode:string;position:string;department:string;branchId:string;branchName:string}|null;
  summary:{todayBookings:number;pendingBookings:number;inServiceBookings:number;upcomingBookings:number;customers:number;activePackages:number};
  scope:{actorId:string;branchId:string|null};
}
