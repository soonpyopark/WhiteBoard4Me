interface MadeByCreditProps {
  hint?: string;
}

const CREDIT_URL = 'https://note4all.tistory.com';

export function MadeByCredit({ hint }: MadeByCreditProps) {
  return (
    <footer className="made-by-credit" aria-label="상태 및 제작자 정보">
      {hint ? <span className="made-by-credit__hint">{hint}</span> : null}
      <span className="made-by-credit__text">
        WhiteBoard4Me - Made by : 청년안민규 (
        <a href={CREDIT_URL} target="_blank" rel="noopener noreferrer">
          {CREDIT_URL}
        </a>
        )
      </span>
    </footer>
  );
}
