// =============================================================================
// SUPABASE EDGE FUNCTION: invite-user
// Purpose: Allows Admin / Super Admin to invite Staff (faculty, hod, accounts,
//          admin) and Parents using SUPABASE_SERVICE_ROLE_KEY strictly on the
//          server side. Never expose SUPABASE_SERVICE_ROLE_KEY in client code.
// Required Supabase Secrets:
//   - SUPABASE_URL
//   - SUPABASE_SERVICE_ROLE_KEY
//   - RESEND_API_KEY (optional for custom transactional notice delivery)
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { z } from 'https://esm.sh/zod@3.23.8';

const InvitePayloadSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2).max(120),
  role: z.enum(['admin', 'accounts', 'hod', 'faculty', 'parent', 'librarian']),
  departmentId: z.string().uuid().optional(),
});

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const authHeader = req.headers.get('Authorization') ?? '';

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // 1. Verify caller identity and role from profiles table
  const token = authHeader.replace('Bearer ', '');
  const { data: userData, error: authErr } = await adminClient.auth.getUser(token);
  if (authErr || !userData.user) {
    return new Response(JSON.stringify({ error: 'Unauthorised' }), { status: 401 });
  }

  const { data: callerProfile } = await adminClient
    .from('profiles')
    .select('role, status')
    .eq('id', userData.user.id)
    .single();

  if (!callerProfile || callerProfile.status !== 'active') {
    return new Response(JSON.stringify({ error: 'Account inactive' }), { status: 403 });
  }

  const parsed = InvitePayloadSchema.safeParse(await req.json());
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Invalid input payload' }), { status: 400 });
  }

  const { email, fullName, role, departmentId } = parsed.data;

  // Only super_admin can invite an admin
  if (role === 'admin' && callerProfile.role !== 'super_admin') {
    return new Response(
      JSON.stringify({ error: 'Only Super Admin may create Admin accounts.' }),
      { status: 403 }
    );
  }

  if (!['super_admin', 'admin'].includes(callerProfile.role)) {
    return new Response(JSON.stringify({ error: 'Insufficient privileges' }), { status: 403 });
  }

  // 2. Dispatch invitation via Supabase Auth Admin API
  const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    email,
    { data: { full_name: fullName } }
  );

  if (inviteError || !invited.user) {
    return new Response(JSON.stringify({ error: 'Unable to dispatch invitation' }), {
      status: 400,
    });
  }

  // 3. Upsert profile with invited role and write audit log
  await adminClient.from('profiles').upsert({
    id: invited.user.id,
    email,
    full_name: fullName,
    role,
    status: 'active',
    department_id: departmentId ?? null,
  });

  await adminClient.from('audit_logs').insert({
    actor_id: userData.user.id,
    action: 'STAFF_INVITATION_SENT',
    entity: 'profiles',
    entity_id: invited.user.id,
    metadata: { email, assigned_role: role },
  });

  return new Response(JSON.stringify({ ok: true, invitedUserId: invited.user.id }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
