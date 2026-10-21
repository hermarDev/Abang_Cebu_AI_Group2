import { handleRegisterApi } from '@/server/actions/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  return handleRegisterApi(request);
}
