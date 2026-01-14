type ThemeMode = "light" | "dark";

const sunIcon = (
  <>
    <circle cx="12" cy="12" r="4" />
    <line x1="12" y1="2" x2="12" y2="4" />
    <line x1="12" y1="20" x2="12" y2="22" />
    <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
    <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
    <line x1="2" y1="12" x2="4" y2="12" />
    <line x1="20" y1="12" x2="22" y2="12" />
    <line x1="6.34" y1="17.66" x2="4.93" y2="19.07" />
    <line x1="19.07" y1="4.93" x2="17.66" y2="6.34" />
  </>
);

const moonIcon = <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />;

export function ThemeToggleIcon({ theme, className }: { theme: ThemeMode; className?: string }) {
  const iconClassName = ["h-5 w-5", className].filter(Boolean).join(" ");

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={iconClassName}
      style={{ display: "block" }}
      aria-hidden="true"
    >
      {theme === "dark" ? sunIcon : moonIcon}
    </svg>
  );
}
