// Small hand-rolled line-icon set (24x24, stroke=currentColor) so the
// sidebar doesn't need a new icon-library dependency for ~10 glyphs.
type IconProps = { className?: string };

function base(paths: React.ReactNode) {
  return function Icon({ className }: IconProps) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        {paths}
      </svg>
    );
  };
}

export const HomeIcon = base(
  <path d="M3 11.5 12 4l9 7.5M5.5 10v9a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1v-9" />
);

export const SearchIcon = base(
  <>
    <circle cx={11} cy={11} r={6.5} />
    <path d="m20 20-4-4" />
  </>
);

export const BulbIcon = base(
  <>
    <path d="M9 18h6M10 21h4M8 14a5 5 0 1 1 8 0c-.8.9-1.3 1.6-1.4 2.5H9.4C9.3 15.6 8.8 14.9 8 14Z" />
  </>
);

export const PeopleIcon = base(
  <>
    <circle cx={9} cy={8} r={3} />
    <path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
    <circle cx={17} cy={9} r={2.3} />
    <path d="M15.5 12c2.3.2 4 1.9 4 4.3" />
  </>
);

export const FunnelIcon = base(<path d="M4 5h16l-6 7.5V18l-4 2v-7.5L4 5Z" />);

export const CheckSquareIcon = base(
  <>
    <rect x={4} y={4} width={16} height={16} rx={2} />
    <path d="m8.5 12.5 2.5 2.5 4.5-5" />
  </>
);

export const ShareIcon = base(
  <>
    <circle cx={6} cy={12} r={2.3} />
    <circle cx={17} cy={6} r={2.3} />
    <circle cx={17} cy={18} r={2.3} />
    <path d="m8 11 7-3.5M8 13l7 3.5" />
  </>
);

export const CalendarIcon = base(
  <>
    <rect x={3.5} y={5} width={17} height={15.5} rx={2} />
    <path d="M3.5 9.5h17M8 3v4M16 3v4" />
  </>
);

export const ChartIcon = base(<path d="M4 20V10M10 20V4M16 20v-7M4 20h16" />);

export const SettingsIcon = base(
  <>
    <circle cx={12} cy={12} r={3} />
    <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2.1-1.2L14 3h-4l-.5 2.7a7 7 0 0 0-2.1 1.2l-2.3-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2.1 1.2L10 21h4l.5-2.7a7 7 0 0 0 2.1-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z" />
  </>
);

export const HelpIcon = base(
  <>
    <circle cx={12} cy={12} r={9} />
    <path d="M9.5 9.3a2.5 2.5 0 1 1 3.7 2.2c-.8.5-1.2.9-1.2 1.8v.4M12 17h.01" />
  </>
);

export const BellIcon = base(
  <>
    <path d="M6 10a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10Z" />
    <path d="M10 19a2 2 0 0 0 4 0" />
  </>
);

export const StarIcon = base(
  <path d="m12 3.5 2.5 5.4 5.9.6-4.4 4 1.2 5.8L12 16.3l-5.2 3 1.2-5.8-4.4-4 5.9-.6L12 3.5Z" />
);
