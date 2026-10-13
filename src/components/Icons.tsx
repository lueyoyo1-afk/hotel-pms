import React from 'react';

interface P {
  size?: number;
  className?: string;
}

function S({ size = 20, className, children }: P & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const IconGrid = (p: P) => (
  <S {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </S>
);

export const IconReceipt = (p: P) => (
  <S {...p}>
    <path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z" />
    <path d="M9 8h6M9 12h6" />
  </S>
);

export const IconChart = (p: P) => (
  <S {...p}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </S>
);

export const IconSwap = (p: P) => (
  <S {...p}>
    <path d="M4 8h13l-3-3M20 16H7l3 3" />
  </S>
);

export const IconMore = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="5" r="1.4" />
    <circle cx="12" cy="12" r="1.4" />
    <circle cx="12" cy="19" r="1.4" />
  </S>
);

export const IconSearch = (p: P) => (
  <S {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" />
  </S>
);

export const IconClose = (p: P) => (
  <S {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </S>
);

export const IconPlus = (p: P) => (
  <S {...p}>
    <path d="M12 5v14M5 12h14" />
  </S>
);

export const IconCheck = (p: P) => (
  <S {...p}>
    <path d="M5 13l4 4L19 7" />
  </S>
);

export const IconLock = (p: P) => (
  <S {...p}>
    <rect x="4" y="10" width="16" height="10" rx="2" />
    <path d="M8 10V7a4 4 0 118 0v3" />
  </S>
);

export const IconTrash = (p: P) => (
  <S {...p}>
    <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
  </S>
);

export const IconWarn = (p: P) => (
  <S {...p}>
    <path d="M12 4l9 16H3z" />
    <path d="M12 10v4M12 17.2v.2" />
  </S>
);

export const IconChevron = (p: P) => (
  <S {...p}>
    <path d="M9 5l7 7-7 7" />
  </S>
);

export const IconBed = (p: P) => (
  <S {...p}>
    <path d="M3 18V7M3 12h13a4 4 0 014 4v2M21 18v-2" />
    <circle cx="7.5" cy="9.5" r="2" />
  </S>
);

export const IconBroom = (p: P) => (
  <S {...p}>
    <path d="M14 4l6 6M12.5 5.5l6 6-5 5-6-6z" />
    <path d="M7.5 10.5L4 14l1.5 1.5L9 12" />
  </S>
);

export const IconWrench = (p: P) => (
  <S {...p}>
    <path d="M15.5 3.5a5 5 0 00-6.4 6.4L3 16v5h5l6.1-6.1a5 5 0 006.4-6.4l-3 3-3.5-3.5z" />
  </S>
);

export const IconCalendar = (p: P) => (
  <S {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </S>
);

export const IconUser = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6" />
  </S>
);

export const IconPhone = (p: P) => (
  <S {...p}>
    <path d="M6 3h3l2 5-2 1a11 11 0 005 5l1-2 5 2v3a2 2 0 01-2 2A16 16 0 014 5a2 2 0 012-2z" />
  </S>
);

export const IconEdit = (p: P) => (
  <S {...p}>
    <path d="M4 20h4L20 8l-4-4L4 16z" />
  </S>
);

export const IconDownload = (p: P) => (
  <S {...p}>
    <path d="M12 4v11M7 11l5 5 5-5M4 20h16" />
  </S>
);

export const IconUpload = (p: P) => (
  <S {...p}>
    <path d="M12 16V5M7 9l5-5 5 5M4 20h16" />
  </S>
);

export const IconSettings = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3v3M12 18v3M4.2 7.5l2.6 1.5M17.2 15l2.6 1.5M4.2 16.5l2.6-1.5M17.2 9l2.6-1.5" />
  </S>
);

export const IconKeyboard = (p: P) => (
  <S {...p}>
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8" />
  </S>
);

export const IconUndo = (p: P) => (
  <S {...p}>
    <path d="M4 10h9a5 5 0 010 10H8M4 10l4-4M4 10l4 4" />
  </S>
);

export const IconInbox = (p: P) => (
  <S {...p}>
    <path d="M3 13h5l1.5 3h5L16 13h5" />
    <path d="M5 5h14l2 8v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5z" />
  </S>
);

export const IconKey = (p: P) => (
  <S {...p}>
    <circle cx="8" cy="8" r="4" />
    <path d="M11 11l9 9M17 17l2-2M14 14l2-2" />
  </S>
);

export const IconArrowRight = (p: P) => (
  <S {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </S>
);

export const IconCopy = (p: P) => (
  <S {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a2 2 0 012-2h8" />
  </S>
);

export const IconClock = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7v5l3.5 2" />
  </S>
);
