import { Prisma, PrismaClient } from '@prisma/client';

export type Row = Record<string, any>;
export interface Store {
  query<T extends Row = Row>(query: Prisma.Sql): Promise<T[]>;
  transaction<T>(run: (store: Store) => Promise<T>): Promise<T>;
}

export const createStore = (client: PrismaClient | Prisma.TransactionClient): Store => ({
  query: <T extends Row>(query: Prisma.Sql) => client.$queryRaw<T[]>(query),
  transaction: async <T>(run: (store: Store) => Promise<T>) => {
    if(!('$transaction' in client)) return run(createStore(client));
    for(let attempt=0;;attempt++) {
      try{return await client.$transaction(tx=>run(createStore(tx)),{isolationLevel:'Serializable',maxWait:10000,timeout:20000});}
      catch(error){const failure=error as {code?:string;meta?:{code?:string}};if(attempt>=2||!(failure.code==='P2034'||['40001','40P01'].includes(failure.meta?.code||'')))throw error;}
    }
  },
});

// This is a read/write contract, not a second schema or a migration source.
export const requiredColumns: Record<string, string[]> = {
  miniapp_customer_profiles:['user_id','preferred_branch_id','skin_type','health_notes','updated_at'],
  miniapp_booking_requests:['user_id','request_key','request_hash','booking_id'],
  miniapp_favorite_services:['user_id','service_id','is_favorite'],
  miniapp_technician_services:['technician_id','service_id','is_active'],
  miniapp_quiz_limits:['enrollment_id','quiz_id','max_attempts','reason'],
  miniapp_lesson_quizzes:['lesson_id','quiz_id'],
  miniapp_quiz_attempts:['id','enrollment_id','quiz_id','expires_at','questions','draft_answers','submission_id'],
  miniapp_lesson_playbacks:['id','enrollment_id','lesson_id','covered_ranges','duration_seconds'],
  miniapp_booking_packages:['booking_id','user_package_id','state'],
  miniapp_package_baselines:['user_package_id','legacy_sessions'],
  users: ['id', 'phone', 'full_name', 'membership_tier', 'reward_points', 'is_active'],
  branches: ['id', 'name', 'opening_time', 'closing_time', 'is_active'],
  services: ['id', 'category_id', 'name', 'price', 'discount_price', 'duration_minutes'],
  service_categories: ['id', 'name'],
  technicians: ['id', 'full_name', 'branch_id', 'specialties'],
  technician_slots: ['id', 'technician_id', 'branch_id', 'slot_date', 'start_time', 'end_time', 'status', 'held_by_user_id', 'hold_expires_at'],
  bookings: ['id', 'customer_id', 'booking_code', 'booking_date', 'start_time', 'end_time', 'base_total', 'final_price', 'status', 'qr_code_hash'],
  booking_items: ['id', 'booking_id', 'service_id', 'price', 'duration_minutes'],
  coupons: ['id', 'code', 'discount_amount', 'discount_percent', 'valid_from', 'valid_to', 'used_count', 'usage_limit'],
  user_vouchers: ['id', 'user_id', 'coupon_id', 'status', 'expires_at', 'used_in_booking_id'],
  voucher_distribution_rules: ['id', 'coupon_id', 'trigger_event', 'target_tier', 'valid_days_after_claim', 'is_active'],
  user_packages: ['id', 'customer_id', 'package_id', 'completed_sessions', 'total_sessions'],
  treatment_packages: ['id', 'name', 'service_id'],
  treatment_journal: ['id', 'customer_id', 'user_package_id', 'treatment_notes', 'session_date'],
  courses: ['id', 'tuition_fee', 'deposit_amount', 'primary_instructor_id', 'category_id'],
  course_categories: ['id', 'name'],
  instructors: ['id', 'full_name'],
  course_chapters: ['id', 'course_id', 'chapter_order'],
  course_lessons: ['id', 'chapter_id', 'lesson_order', 'video_url'],
  course_enrollments: ['id', 'student_id', 'course_id', 'tuition_total', 'status', 'progress_percent'],
  user_lesson_progress:['id','enrollment_id','lesson_id','is_completed','watched_seconds'],
  batch_schedules:['id','batch_id','session_date','start_time','end_time','topic'],
  student_attendance:['id','schedule_id','enrollment_id','status'],
  student_academic_records:['id','enrollment_id','theory_score','practical_score','is_graduated'],
  student_certificates:['id','student_id','course_id','enrollment_id','status','certificate_code'],
  course_quizzes: ['id', 'course_id', 'passing_score'],
  quiz_questions: ['id', 'quiz_id', 'question_text', 'correct_option', 'options'],
  quiz_submissions: ['id', 'quiz_id', 'enrollment_id', 'submitted_answers', 'score', 'passed'],
  notifications: ['id', 'user_id', 'data', 'is_read'],
  invoices: ['id', 'customer_id', 'invoice_code', 'payment_status', 'total_amount'],
  point_transactions: ['id', 'user_id', 'points_change', 'balance_after'],
  support_tickets:['id','customer_id','subject','message','status','admin_reply'],
  consultation_surveys:['id','customer_id','booking_id','focus_areas','pressure_pref'],
  reviews:['id','customer_id','booking_id','service_id','rating'],
  home_care_guidelines:['id','title','content','steps','is_published'],
  support_faqs:['id','question','answer','is_active','display_order'],
  membership_tier_rules:['tier','min_accumulated_spent','point_earning_rate','discount_service_percent'],
  loyalty_point_settings:['id','earn_amount_per_point','redeem_value_per_point','is_active'],
  user_settings:['user_id','appointment_reminder','promotion_notify','system_notify','language'],
  referrals:['id','referrer_id','referee_id','reward_points','is_rewarded'],
  course_batches:['id','course_id','branch_id','instructor_id','status'],
  invoice_items:['id','invoice_id','item_name','quantity','unit_price','amount'],
  tuition_transactions:['id','enrollment_id','student_id','amount','payment_status','receipt_pdf_url'],
};

export async function validateSharedSchema(store: Store) {
  const [schema] = await store.query(Prisma.sql`SELECT current_schema() AS name`);
  if (schema?.name !== 'public') throw new Error('Database does not match database/schema.sql: public schema required');
  const columns = await store.query(Prisma.sql`
    SELECT table_name, column_name, udt_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name IN (${Prisma.join(Object.keys(requiredColumns))})
  `);
  const missing = Object.entries(requiredColumns).flatMap(([table, names]) =>
    names.filter((name) => !columns.some((column) => column.table_name === table && column.column_name === name))
      .map((name) => `${table}.${name}`));
  for (const table of Object.keys(requiredColumns)) {
    if (requiredColumns[table].includes('id') && table !== 'loyalty_point_settings'
      && !columns.some((column) => column.table_name === table && column.column_name === 'id' && column.udt_name === 'uuid')) {
      missing.push(`${table}.id must be UUID`);
    }
  }
  if (missing.length) throw new Error(`Database does not match database/schema.sql: ${missing.join(', ')}`);
  const values = await store.query(Prisma.sql`SELECT t.typname AS name,e.enumlabel AS value
    FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname IN ('booking_status','member_tier','enrollment_status','payment_status','voucher_status')`);
  const expected: Record<string,string[]> = {
    booking_status:['PENDING','CONFIRMED','CHECKED_IN','IN_SERVICE','COMPLETED','CANCELLED','NO_SHOW'],
    member_tier:['STANDARD','SILVER','GOLD','PLATINUM','DIAMOND'],
    enrollment_status:['CONSULTING','DEPOSITED','ENROLLED','STUDYING','GRADUATED','DROPPED'],
    payment_status:['UNPAID','PENDING','PARTIAL','PAID','REFUNDED','FAILED'],
    voucher_status:['AVAILABLE','USED','EXPIRED'],
  };
  const enumMismatch = Object.entries(expected).flatMap(([name, labels]) =>
    labels.filter(label => !values.some(row => row.name === name && row.value === label)).map(label=>`${name}.${label}`));
  if (enumMismatch.length) throw new Error(`Database does not match database/schema.sql: ${enumMismatch.join(', ')}`);
}

export function camel(value: any): any {
  if (value == null) return value;
  if (value instanceof Date) return value.toISOString();
  if (Prisma.Decimal.isDecimal(value)) return value.toNumber();
  if (typeof value === 'bigint') return Number(value);
  if (Array.isArray(value)) return value.map(camel);
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'password_hash')
      .map(([key, child]) => [key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()), camel(child)]));
  }
  return value;
}
