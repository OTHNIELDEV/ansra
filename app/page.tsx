import Landing from '../components/Landing';

export const dynamic = 'force-dynamic';

export default function Page() {
  return <Landing leadsEnabled={process.env.LEADS_ENABLED === 'true'} />;
}
