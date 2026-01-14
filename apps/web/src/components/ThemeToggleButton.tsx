import { useTheme } from "../hooks/useTheme";

type ThemeToggleButtonProps = {
  className?: string;
};

const sunIcon = (
  <path d="M12 2.75a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 12 2.75Zm0 15.75a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0 2.75a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 .75-.75ZM4.97 4.97a.75.75 0 0 1 1.06 0l1.06 1.06a.75.75 0 1 1-1.06 1.06L4.97 6.03a.75.75 0 0 1 0-1.06Zm12.94 12.94a.75.75 0 0 1 1.06 0l1.06 1.06a.75.75 0 1 1-1.06 1.06l-1.06-1.06a.75.75 0 0 1 0-1.06ZM2.75 12a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5H3.5A.75.75 0 0 1 2.75 12Zm16 0a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1-.75-.75ZM4.97 19.03a.75.75 0 0 1 0-1.06l1.06-1.06a.75.75 0 1 1 1.06 1.06L6.03 19.03a.75.75 0 0 1-1.06 0Zm12.94-12.94a.75.75 0 0 1 0-1.06l1.06-1.06a.75.75 0 1 1 1.06 1.06l-1.06 1.06a.75.75 0 0 1-1.06 0Z" />
);

const moonIcon = <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />;

export function ThemeToggleButton({ className }: ThemeToggleButtonProps) {
  const { theme, toggleTheme } = useTheme();
  const buttonClassName = [
    "inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-orange-500 shadow-sm transition hover:bg-slate-50",
    "dark:border-slate-700 dark:bg-slate-900 dark:text-amber-200 dark:hover:bg-slate-800",
    className
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type="button" className={buttonClassName} onClick={toggleTheme} aria-label="Alternar tema">
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        style={{ display: "block" }}
      >
        {theme === "dark" ? sunIcon : moonIcon}
      </svg>
    </button>
  );
}
