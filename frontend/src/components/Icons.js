import React from 'react';

// Common Lucide-style Monochrome Line SVG Wrapper
const SvgIcon = ({ children, size = 18, className = '', style = {}, viewBox = '0 0 24 24', strokeWidth = '2', ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox={viewBox}
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`svg-icon ${className}`}
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    {...props}
  >
    {children}
  </svg>
);

export const DashboardIcon = (props) => (
  <SvgIcon {...props}>
    <rect x="3" y="3" width="7" height="9" rx="1" />
    <rect x="14" y="3" width="7" height="5" rx="1" />
    <rect x="14" y="12" width="7" height="9" rx="1" />
    <rect x="3" y="16" width="7" height="5" rx="1" />
  </SvgIcon>
);

export const DevicesIcon = (props) => (
  <SvgIcon {...props}>
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </SvgIcon>
);

export const CreateIcon = (props) => (
  <SvgIcon {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </SvgIcon>
);

export const ApprovalsIcon = (props) => (
  <SvgIcon {...props}>
    <polyline points="9 11 12 14 22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </SvgIcon>
);

export const InventoryIcon = (props) => (
  <SvgIcon {...props}>
    <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </SvgIcon>
);

export const UsersIcon = (props) => (
  <SvgIcon {...props}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </SvgIcon>
);

export const UserIcon = (props) => (
  <SvgIcon {...props}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </SvgIcon>
);

export const MailIcon = (props) => (
  <SvgIcon {...props}>
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </SvgIcon>
);

export const LockIcon = (props) => (
  <SvgIcon {...props}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </SvgIcon>
);

export const KeyIcon = (props) => (
  <SvgIcon {...props}>
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </SvgIcon>
);

export const SettingsIcon = (props) => (
  <SvgIcon {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </SvgIcon>
);

export const LogoutIcon = (props) => (
  <SvgIcon {...props}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </SvgIcon>
);

export const TrashIcon = (props) => (
  <SvgIcon {...props}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </SvgIcon>
);

export const EditIcon = (props) => (
  <SvgIcon {...props}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </SvgIcon>
);

export const SearchIcon = (props) => (
  <SvgIcon {...props}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </SvgIcon>
);

export const ClockIcon = (props) => (
  <SvgIcon {...props}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </SvgIcon>
);

export const AlertIcon = (props) => (
  <SvgIcon {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </SvgIcon>
);

export const SuccessIcon = (props) => (
  <SvgIcon {...props}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </SvgIcon>
);

export const CheckIcon = (props) => (
  <SvgIcon {...props}>
    <polyline points="20 6 9 17 4 12" />
  </SvgIcon>
);

export const XIcon = (props) => (
  <SvgIcon {...props}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </SvgIcon>
);

export const NetworkIcon = (props) => (
  <SvgIcon {...props}>
    <rect x="16" y="16" width="6" height="6" rx="1" />
    <rect x="2" y="16" width="6" height="6" rx="1" />
    <rect x="9" y="2" width="6" height="6" rx="1" />
    <path d="M12 8v8M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" />
  </SvgIcon>
);

export const HardwareIcon = (props) => (
  <SvgIcon {...props}>
    <rect x="2" y="2" width="20" height="8" rx="2" />
    <rect x="2" y="14" width="20" height="8" rx="2" />
    <line x1="6" y1="6" x2="6.01" y2="6" />
    <line x1="10" y1="6" x2="10.01" y2="6" />
    <line x1="6" y1="18" x2="6.01" y2="18" />
    <line x1="10" y1="18" x2="10.01" y2="18" />
  </SvgIcon>
);

export const AccessIcon = (props) => (
  <SvgIcon {...props}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </SvgIcon>
);

export const SoftwareIcon = (props) => (
  <SvgIcon {...props}>
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </SvgIcon>
);

export const SparklesIcon = (props) => (
  <SvgIcon {...props}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </SvgIcon>
);

export const LogoIcon = ({ size = 28, ...props }) => (
  <SvgIcon size={size} viewBox="0 0 24 24" strokeWidth="2.2" {...props}>
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </SvgIcon>
);

export const ShieldIcon = (props) => (
  <SvgIcon {...props}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </SvgIcon>
);

export const FileTextIcon = (props) => (
  <SvgIcon {...props}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </SvgIcon>
);

export const DownloadIcon = (props) => (
  <SvgIcon {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </SvgIcon>
);

export const UploadIcon = (props) => (
  <SvgIcon {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </SvgIcon>
);

export const RefreshIcon = (props) => (
  <SvgIcon {...props}>
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </SvgIcon>
);

export const FilterIcon = (props) => (
  <SvgIcon {...props}>
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </SvgIcon>
);

export const PlusIcon = (props) => (
  <SvgIcon {...props}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </SvgIcon>
);

export const MinusIcon = (props) => (
  <SvgIcon {...props}>
    <line x1="5" y1="12" x2="19" y2="12" />
  </SvgIcon>
);

export const ChevronRightIcon = (props) => (
  <SvgIcon {...props}>
    <polyline points="9 18 15 12 9 6" />
  </SvgIcon>
);

export const ChevronDownIcon = (props) => (
  <SvgIcon {...props}>
    <polyline points="6 9 12 15 18 9" />
  </SvgIcon>
);

export const ArrowRightIcon = (props) => (
  <SvgIcon {...props}>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </SvgIcon>
);

export const CalendarIcon = (props) => (
  <SvgIcon {...props}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </SvgIcon>
);

export const BarChartIcon = (props) => (
  <SvgIcon {...props}>
    <line x1="12" y1="20" x2="12" y2="10" />
    <line x1="18" y1="20" x2="18" y2="4" />
    <line x1="6" y1="20" x2="6" y2="16" />
  </SvgIcon>
);

export const PieChartIcon = (props) => (
  <SvgIcon {...props}>
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
    <path d="M22 12A10 10 0 0 0 12 2v10z" />
  </SvgIcon>
);

export const TrendingUpIcon = (props) => (
  <SvgIcon {...props}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </SvgIcon>
);

export const InfoIcon = (props) => (
  <SvgIcon {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </SvgIcon>
);

export const BotIcon = (props) => (
  <SvgIcon {...props}>
    <rect x="3" y="11" width="18" height="10" rx="2" />
    <circle cx="12" cy="5" r="2" />
    <path d="M12 7v4" />
    <line x1="8" y1="16" x2="8.01" y2="16" />
    <line x1="16" y1="16" x2="16.01" y2="16" />
  </SvgIcon>
);

export const BriefcaseIcon = (props) => (
  <SvgIcon {...props}>
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </SvgIcon>
);

export const TagIcon = (props) => (
  <SvgIcon {...props}>
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </SvgIcon>
);

export const LinkIcon = (props) => (
  <SvgIcon {...props}>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </SvgIcon>
);

export const MonitorIcon = (props) => (
  <SvgIcon {...props}>
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </SvgIcon>
);

export const HeadphonesIcon = (props) => (
  <SvgIcon {...props}>
    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
  </SvgIcon>
);

export const PhoneIcon = (props) => (
  <SvgIcon {...props}>
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
    <line x1="12" y1="18" x2="12.01" y2="18" />
  </SvgIcon>
);

export const CategoryDeviceIcon = ({ category, size = 18, color, style = {} }) => {
  const cat = (category || '').toLowerCase();
  if (cat.includes('laptop') || cat.includes('notebook')) {
    return <DevicesIcon size={size} style={{ color: color || '#38bdf8', ...style }} />;
  }
  if (cat.includes('desktop') || cat.includes('pc') || cat.includes('workstation')) {
    return <HardwareIcon size={size} style={{ color: color || '#818cf8', ...style }} />;
  }
  if (cat.includes('monitor') || cat.includes('screen') || cat.includes('display')) {
    return <MonitorIcon size={size} style={{ color: color || '#c084fc', ...style }} />;
  }
  if (cat.includes('keyboard') || cat.includes('mouse') || cat.includes('input')) {
    return <HardwareIcon size={size} style={{ color: color || '#f472b6', ...style }} />;
  }
  if (cat.includes('headphone') || cat.includes('audio') || cat.includes('headset')) {
    return <HeadphonesIcon size={size} style={{ color: color || '#fb7185', ...style }} />;
  }
  if (cat.includes('phone') || cat.includes('mobile') || cat.includes('cellular')) {
    return <PhoneIcon size={size} style={{ color: color || '#4ade80', ...style }} />;
  }
  if (cat.includes('network') || cat.includes('wifi') || cat.includes('router')) {
    return <NetworkIcon size={size} style={{ color: color || '#fbbf24', ...style }} />;
  }
  return <InventoryIcon size={size} style={{ color: color || '#94a3b8', ...style }} />;
};
