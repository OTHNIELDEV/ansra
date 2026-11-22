import type { Metadata } from 'next';
import Dashboard from '../../components/Dashboard';

export const metadata: Metadata = { title: 'ANSRA 대시보드 (예시 데이터)' };

export default function Page() {
  return <Dashboard />;
}
