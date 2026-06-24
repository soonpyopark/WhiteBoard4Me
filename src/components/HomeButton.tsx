import { navigateHome } from '../utils/navigateHome';

interface HomeButtonProps {
  onAppHome?: () => void;
  className?: string;
}

export function HomeButton({ onAppHome, className = '' }: HomeButtonProps) {
  return (
    <button
      type="button"
      className={`home-btn ${className}`.trim()}
      onClick={() => navigateHome(onAppHome)}
      title="홈"
      aria-label="홈"
    >
      <svg
        className="home-btn-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V20h14V9.5" />
        <path d="M9 20v-6h6v6" />
      </svg>
    </button>
  );
}
