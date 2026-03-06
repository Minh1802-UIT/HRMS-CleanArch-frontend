import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

export type Lang = 'en' | 'vi';

const TRANSLATIONS: Record<Lang, Record<string, string>> = {
  en: {
    // Sidebar groups
    'Main': 'Main',
    'Workforce': 'Workforce',
    'Time & Leave': 'Time & Leave',
    'Talent': 'Talent',
    'Finance': 'Finance',
    'System': 'System',
    // Sidebar nav items
    'Dashboard': 'Dashboard',
    'Employees': 'Employees',
    'Departments': 'Departments',
    'Positions': 'Positions',
    'Org Chart': 'Org Chart',
    'Check In/Out': 'Check In/Out',
    'My History': 'My History',
    'My Explanations': 'My Explanations',
    'Attendance': 'Attendance',
    'Shifts': 'Shifts',
    'Leave Request': 'Leave Request',
    'Approvals': 'Approvals',
    'Explanations': 'Explanations',
    'Leave Reports': 'Leave Reports',
    'Performance': 'Performance',
    'Recruitment': 'Recruitment',
    'Payroll': 'Payroll',
    'Users': 'Users',
    'Audit Logs': 'Audit Logs',
    // Page titles
    'Leave Requests': 'Leave Requests',
    'User Management': 'User Management',
    'My Profile': 'My Profile',
    'HR Management': 'HR Management',
    // Navbar UI
    'Notifications': 'Notifications',
    'Mark all read': 'Mark all read',
    'No notifications': 'No notifications',
    'No notifications yet.': 'No notifications yet.',
    'Close': 'Close',
    'Profile': 'Profile',
    'Settings': 'Settings',
    'Logout': 'Logout',
    'Login': 'Login',
    'Switch to Light Mode': 'Switch to Light Mode',
    'Switch to Dark Mode': 'Switch to Dark Mode',
    'Switch to Vietnamese': 'Switch to Vietnamese',
    'Switch to English': 'Switch to English',
    'Toggle sidebar': 'Toggle sidebar',
  },
  vi: {
    // Sidebar groups
    'Main': 'Tổng quan',
    'Workforce': 'Nhân sự',
    'Time & Leave': 'Thời gian & Nghỉ phép',
    'Talent': 'Nhân tài',
    'Finance': 'Tài chính',
    'System': 'Hệ thống',
    // Sidebar nav items
    'Dashboard': 'Tổng quan',
    'Employees': 'Nhân viên',
    'Departments': 'Phòng ban',
    'Positions': 'Chức vụ',
    'Org Chart': 'Sơ đồ tổ chức',
    'Check In/Out': 'Chấm công',
    'My History': 'Lịch sử của tôi',
    'My Explanations': 'Lịch sử giải trình',
    'Attendance': 'Quản lý chấm công',
    'Shifts': 'Ca làm việc',
    'Leave Request': 'Xin nghỉ phép',
    'Approvals': 'Phê duyệt',
    'Explanations': 'Giải trình',
    'Leave Reports': 'Báo cáo nghỉ phép',
    'Performance': 'Hiệu suất',
    'Recruitment': 'Tuyển dụng',
    'Payroll': 'Bảng lương',
    'Users': 'Người dùng',
    'Audit Logs': 'Nhật ký kiểm tra',
    // Page titles
    'Leave Requests': 'Nghỉ phép',
    'User Management': 'Quản lý người dùng',
    'My Profile': 'Hồ sơ của tôi',
    'HR Management': 'Quản lý nhân sự',
    // Navbar UI
    'Notifications': 'Thông báo',
    'Mark all read': 'Đánh dấu đã đọc',
    'No notifications': 'Không có thông báo',
    'No notifications yet.': 'Chưa có thông báo.',
    'Close': 'Đóng',
    'Profile': 'Hồ sơ',
    'Settings': 'Cài đặt',
    'Logout': 'Đăng xuất',
    'Login': 'Đăng nhập',
    'Switch to Light Mode': 'Chuyển sang sáng',
    'Switch to Dark Mode': 'Chuyển sang tối',
    'Switch to Vietnamese': 'Chuyển sang Tiếng Việt',
    'Switch to English': 'Chuyển sang Tiếng Anh',
    'Toggle sidebar': 'Bật/tắt menu',
  }
};

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly STORAGE_KEY = 'hrms-lang';

  lang = signal<Lang>(this._loadPreference());

  /** Emit when language changes so OnPush components can markForCheck() */
  readonly langChange$ = new Subject<Lang>();

  toggle(): void {
    const next: Lang = this.lang() === 'en' ? 'vi' : 'en';
    this.lang.set(next);
    this.langChange$.next(next);
    localStorage.setItem(this.STORAGE_KEY, next);
  }

  /** Look up a translation key for the current language. Falls back to the key itself. */
  t(key: string): string {
    return TRANSLATIONS[this.lang()][key] ?? TRANSLATIONS['en'][key] ?? key;
  }

  private _loadPreference(): Lang {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored === 'vi' ? 'vi' : 'en';
  }
}
