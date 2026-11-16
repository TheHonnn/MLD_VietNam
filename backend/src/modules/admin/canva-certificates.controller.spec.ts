import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterEach, expect, it, vi } from 'vitest';
import type { AdminDatabase } from './admin.database';
import { CanvaCertificatesController } from './canva-certificates.controller';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

it('connects with PKCE, refreshes credentials, fills only tagged fields and follows export status', async () => {
  vi.stubEnv('CANVA_CLIENT_ID', 'test-client-id');
  vi.stubEnv('CANVA_CLIENT_SECRET', 'test-client-secret');
  vi.stubEnv('CANVA_REDIRECT_URI', 'https://admin.example/certificates');
  vi.stubEnv('CANVA_CERTIFICATE_DESIGN_ID', 'DA-template');
  const database = new PGlite();
  const adminId = '00000000-0000-4000-8000-000000000001';
  const admin = { admin: { id: adminId, role: 'ADMIN' } };
  const other = { admin: { id: '00000000-0000-4000-8000-000000000002', role: 'ADMIN' } };
  const id = '00000000-0000-4000-8000-000000000003';
  try {
    await database.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated;
      CREATE TABLE public.users(id uuid PRIMARY KEY);
      INSERT INTO public.users VALUES('${adminId}');
      CREATE TABLE public.course_enrollments(id uuid PRIMARY KEY, order_code text);
      INSERT INTO public.course_enrollments VALUES('${id}', 'HV-01');
      CREATE TABLE public.student_certificates(
        id uuid PRIMARY KEY,enrollment_id uuid,status text,student_name text,course_title text,certificate_code text,issue_date date,date_of_birth date
      );
      INSERT INTO public.student_certificates VALUES('${id}','${id}','ISSUED','Nguyễn Ánh','Khóa mẫu','GCN-01','2026-11-16','2000-10-05');
    `);
    const migration = readFileSync(resolve(__dirname, '../../../../database/migrations/043_canva_certificate_connections.sql'), 'utf8');
    await database.exec(migration);
    const client = {
      query: async (sql: string, values?: unknown[]) => {
        const result = await database.query(sql, values);
        return { ...result, rowCount: result.affectedRows || result.rows.length };
      }, release() {},
    };
    const controller = new CanvaCertificatesController({ connection: { ...client, connect: async () => client } } as unknown as AdminDatabase);
    const fetch = vi.spyOn(globalThis, 'fetch');
    const authorize = new URL((await controller.connect(admin)).url);
    const state = authorize.searchParams.get('state')!;
    expect(authorize.searchParams.get('code_challenge_method')).toBe('S256');
    await expect(controller.complete(other, { code: 'mock-code', state })).rejects.toMatchObject({ status: 400 });
    expect(fetch).not.toHaveBeenCalled();
    fetch.mockResolvedValueOnce(Response.json({ access_token: 'access-first', refresh_token: 'refresh-first', expires_in: 20 }));
    await expect(controller.complete(admin, { code: 'mock-code', state })).resolves.toEqual({ connected: true });
    expect(String(fetch.mock.calls[0][1]?.body)).toContain('code_verifier=');
    await expect(controller.complete(admin, { code: 'mock-code', state })).rejects.toMatchObject({ status: 400 });
    const stored = await database.query<{ credentials: string }>('SELECT credentials FROM mld_private.canva_certificate_connections');
    expect(stored.rows[0].credentials).not.toMatch(/access-first|refresh-first/);
    await expect(controller.status(admin)).resolves.toEqual({ configured: true, connected: true, designId: 'DA-template' });
    await expect(controller.generate({ admin: { id: adminId, role: 'BRANCH_MANAGER' } }, { certificateId: id })).rejects.toMatchObject({ status: 403 });

    const dataset = Object.fromEntries(
      ['STUDENT_NAME', 'COURSE_TITLE', 'CERTIFICATE_CODE', 'ISSUE_DATE', 'STUDENT_CODE'].map(key => [key, { type: 'text' }]),
    );
    fetch.mockResolvedValueOnce(Response.json({ access_token: 'access-next', refresh_token: 'refresh-next', expires_in: 3600 }));
    fetch.mockResolvedValueOnce(Response.json({ dataset }));
    fetch.mockResolvedValueOnce(Response.json({ job: { id: 'auto-1', status: 'in_progress' } }));
    const { ticket } = await controller.generate(admin, { certificateId: id });
    expect(String(fetch.mock.calls[1][1]?.body)).toContain('refresh_token=refresh-first');
    const payload = JSON.parse(String(fetch.mock.calls[3][1]?.body));
    expect(payload).toMatchObject({ type: 'create_from_design', design_id: 'DA-template' });
    expect(payload.data).toEqual({
      STUDENT_NAME: { type: 'text', text: 'Nguyễn Ánh' }, COURSE_TITLE: { type: 'text', text: 'Khóa mẫu' },
      CERTIFICATE_CODE: { type: 'text', text: 'GCN-01' }, ISSUE_DATE: { type: 'text', text: '16/11/2026' },
      STUDENT_CODE: { type: 'text', text: 'HV-01' },
    });
    await expect(controller.progress(other, { ticket })).rejects.toMatchObject({ status: 400 });
    fetch.mockResolvedValueOnce(Response.json({ job: { id: 'auto-1', status: 'in_progress' } }));
    await expect(controller.progress(admin, { ticket })).resolves.toEqual({ ticket });
    fetch.mockResolvedValueOnce(Response.json({ job: { status: 'success', result: { design: { id: 'DA-filled' } } } }));
    fetch.mockResolvedValueOnce(Response.json({ job: { id: 'export-1', status: 'in_progress' } }));
    const progress = await controller.progress(admin, { ticket });
    fetch.mockResolvedValueOnce(Response.json({ job: { status: 'success', urls: ['https://export-download.canva.com/test.pdf'] } }));
    await expect(controller.progress(admin, { ticket: progress.ticket })).resolves.toEqual({
      pdfUrl: 'https://export-download.canva.com/test.pdf', designUrl: 'https://www.canva.com/design/DA-filled/edit',
    });
    await database.exec("UPDATE public.student_certificates SET status='REVOKED'");
    await expect(controller.generate(admin, { certificateId: id })).rejects.toMatchObject({ status: 400 });
    await database.exec('SET ROLE authenticated');
    await expect(database.query('SELECT credentials FROM mld_private.canva_certificate_connections')).rejects.toMatchObject({ code: '42501' });
  } finally { await database.close(); }
}, 30000);
