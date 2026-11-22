'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  ['/app', '개요'],
  ['/app/citations', '인용 출처'],
  ['/app/opportunities', '노출 기회'],
  ['/app/contents', '콘텐츠 검수'],
] as const;

export default function AppNav() {
  const path = usePathname();
  return (
    <nav aria-label="앱 메뉴" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {ITEMS.map(([href, text]) => {
        const on = path === href;
        return (
          <Link key={href} href={href} aria-current={on ? 'page' : undefined}
            style={{ minHeight: 44, display: 'inline-flex', alignItems: 'center', padding: '0 16px', borderRadius: 22, fontSize: 14, textDecoration: 'none',
              border: '1px solid ' + (on ? '#111418' : '#D5D9DF'), background: on ? '#111418' : '#fff', color: on ? '#fff' : '#3B424C' }}>
            {text}
          </Link>
        );
      })}
    </nav>
  );
}
