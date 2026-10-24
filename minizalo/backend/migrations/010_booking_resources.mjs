export const version='010_booking_resources_v3';
export const statements=[
`CREATE TABLE IF NOT EXISTS miniapp_booking_beds (
 booking_id uuid PRIMARY KEY REFERENCES bookings(id),
 room_id uuid NOT NULL REFERENCES branch_rooms(id),
 bed_number integer NOT NULL CHECK(bed_number>0),
 created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
`CREATE INDEX IF NOT EXISTS idx_miniapp_booking_beds_room ON miniapp_booking_beds(room_id,bed_number)`,
`CREATE TABLE IF NOT EXISTS miniapp_booking_group_members (
 booking_id uuid PRIMARY KEY REFERENCES bookings(id),
 group_id uuid NOT NULL,
 member_number integer NOT NULL CHECK(member_number>0),
 UNIQUE(group_id,member_number)
)`,
`CREATE INDEX IF NOT EXISTS idx_miniapp_booking_group_members_group ON miniapp_booking_group_members(group_id)`,
`CREATE OR REPLACE FUNCTION miniapp_check_booking_resources() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE current_booking bookings%ROWTYPE; assigned_bed miniapp_booking_beds%ROWTYPE; capacity integer; used integer; canonical_bed integer; booked_bed integer;
BEGIN
 IF TG_TABLE_NAME='bookings' THEN SELECT * INTO current_booking FROM bookings WHERE id=NEW.id;
 ELSE SELECT * INTO current_booking FROM bookings WHERE id=NEW.booking_id; END IF;
 IF NOT FOUND OR current_booking.status NOT IN ('PENDING','CONFIRMED','CHECKED_IN','IN_SERVICE') THEN RETURN NEW; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('beds:'||current_booking.branch_id::text||':'||current_booking.booking_date::text));
 IF current_booking.technician_id IS NOT NULL THEN
   PERFORM pg_advisory_xact_lock(hashtext('technician:'||current_booking.technician_id::text||':'||current_booking.booking_date::text));
 END IF;
 IF current_booking.technician_id IS NOT NULL AND EXISTS(SELECT 1 FROM bookings b WHERE b.id<>current_booking.id
   AND b.technician_id=current_booking.technician_id AND b.booking_date=current_booking.booking_date
   AND b.status IN ('PENDING','CONFIRMED','CHECKED_IN','IN_SERVICE') AND b.start_time<current_booking.end_time AND b.end_time>current_booking.start_time) THEN
   RAISE EXCEPTION 'Treatment resource conflict' USING ERRCODE='23P01';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM miniapp_booking_beds bb JOIN bookings b ON b.id=bb.booking_id WHERE b.branch_id=current_booking.branch_id) THEN RETURN NEW; END IF;
 SELECT COALESCE(sum(bed_capacity),0) INTO capacity FROM branch_rooms WHERE branch_id=current_booking.branch_id AND is_available AND room_type NOT IN ('ACADEMY_CLASSROOM','PRACTICE_LAB');
 -- Equal-time ends and starts cancel before computing simultaneous occupancy.
 SELECT COALESCE(max(load),0) INTO used FROM (
   SELECT sum(change) OVER(ORDER BY moment) AS load FROM (
     SELECT moment,sum(change) AS change FROM (
       SELECT GREATEST(b.start_time,current_booking.start_time) AS moment,1 AS change FROM bookings b WHERE b.branch_id=current_booking.branch_id AND b.booking_date=current_booking.booking_date
         AND b.status IN ('PENDING','CONFIRMED','CHECKED_IN','IN_SERVICE') AND b.start_time<current_booking.end_time AND b.end_time>current_booking.start_time
       UNION ALL SELECT LEAST(b.end_time,current_booking.end_time),-1 FROM bookings b WHERE b.branch_id=current_booking.branch_id AND b.booking_date=current_booking.booking_date
         AND b.status IN ('PENDING','CONFIRMED','CHECKED_IN','IN_SERVICE') AND b.start_time<current_booking.end_time AND b.end_time>current_booking.start_time
     ) events GROUP BY moment
   ) grouped_events
 ) occupancy;
 IF used>capacity THEN RAISE EXCEPTION 'Treatment resource conflict' USING ERRCODE='23P01'; END IF;
 SELECT * INTO assigned_bed FROM miniapp_booking_beds WHERE booking_id=current_booking.id;
 IF FOUND THEN
   IF assigned_bed.room_id IS DISTINCT FROM current_booking.assigned_room_id OR NOT EXISTS(SELECT 1 FROM branch_rooms r WHERE r.id=assigned_bed.room_id
     AND r.branch_id=current_booking.branch_id AND r.is_available AND r.room_type NOT IN ('ACADEMY_CLASSROOM','PRACTICE_LAB') AND r.bed_capacity>=assigned_bed.bed_number) THEN
     RAISE EXCEPTION 'Treatment resource conflict' USING ERRCODE='23P01';
   END IF;
 END IF;
 canonical_bed:=CASE WHEN btrim(current_booking.assigned_bed_number) ~ '^0*[1-9][0-9]{0,8}$' THEN btrim(current_booking.assigned_bed_number)::integer END;
 booked_bed:=COALESCE(assigned_bed.bed_number,canonical_bed);
 IF assigned_bed.bed_number IS NOT NULL AND NULLIF(btrim(current_booking.assigned_bed_number),'') IS NOT NULL AND assigned_bed.bed_number IS DISTINCT FROM canonical_bed THEN
   RAISE EXCEPTION 'Treatment resource conflict' USING ERRCODE='23P01';
 END IF;
 IF booked_bed IS NOT NULL AND NOT EXISTS(SELECT 1 FROM branch_rooms r WHERE r.id=current_booking.assigned_room_id
   AND r.branch_id=current_booking.branch_id AND r.is_available AND r.room_type NOT IN ('ACADEMY_CLASSROOM','PRACTICE_LAB') AND r.bed_capacity>=booked_bed) THEN
   RAISE EXCEPTION 'Treatment resource conflict' USING ERRCODE='23P01';
 END IF;
 IF EXISTS(SELECT 1 FROM bookings b LEFT JOIN miniapp_booking_beds bb ON bb.booking_id=b.id WHERE b.id<>current_booking.id
   AND COALESCE(bb.room_id,b.assigned_room_id)=current_booking.assigned_room_id
   AND ((booked_bed IS NOT NULL AND COALESCE(bb.bed_number,CASE WHEN btrim(b.assigned_bed_number) ~ '^0*[1-9][0-9]{0,8}$' THEN btrim(b.assigned_bed_number)::integer END)=booked_bed)
     OR (NULLIF(btrim(current_booking.assigned_bed_number),'') IS NOT NULL AND lower(btrim(b.assigned_bed_number))=lower(btrim(current_booking.assigned_bed_number)))
     OR (booked_bed IS NOT NULL AND bb.booking_id IS NULL AND NULLIF(btrim(b.assigned_bed_number),'') IS NOT NULL AND btrim(b.assigned_bed_number) !~ '^0*[1-9][0-9]{0,8}$')
     OR (booked_bed IS NULL AND NULLIF(btrim(current_booking.assigned_bed_number),'') IS NOT NULL AND (bb.bed_number IS NOT NULL OR btrim(b.assigned_bed_number) ~ '^0*[1-9][0-9]{0,8}$')))
   AND b.booking_date=current_booking.booking_date AND b.status IN ('PENDING','CONFIRMED','CHECKED_IN','IN_SERVICE')
   AND b.start_time<current_booking.end_time AND b.end_time>current_booking.start_time) THEN
   RAISE EXCEPTION 'Treatment resource conflict' USING ERRCODE='23P01';
 END IF;
 IF current_booking.assigned_room_id IS NOT NULL THEN
   SELECT bed_capacity INTO capacity FROM branch_rooms WHERE id=current_booking.assigned_room_id AND branch_id=current_booking.branch_id AND is_available AND room_type NOT IN ('ACADEMY_CLASSROOM','PRACTICE_LAB');
   SELECT COALESCE(max(load),0) INTO used FROM (
     SELECT sum(change) OVER(ORDER BY moment) AS load FROM (
       SELECT moment,sum(change) AS change FROM (
         SELECT GREATEST(b.start_time,current_booking.start_time) AS moment,1 AS change FROM bookings b WHERE b.assigned_room_id=current_booking.assigned_room_id AND b.booking_date=current_booking.booking_date
           AND b.status IN ('PENDING','CONFIRMED','CHECKED_IN','IN_SERVICE') AND b.start_time<current_booking.end_time AND b.end_time>current_booking.start_time
         UNION ALL SELECT LEAST(b.end_time,current_booking.end_time),-1 FROM bookings b WHERE b.assigned_room_id=current_booking.assigned_room_id AND b.booking_date=current_booking.booking_date
           AND b.status IN ('PENDING','CONFIRMED','CHECKED_IN','IN_SERVICE') AND b.start_time<current_booking.end_time AND b.end_time>current_booking.start_time
       ) events GROUP BY moment
     ) grouped_events
   ) occupancy;
   IF capacity IS NULL OR used>capacity THEN RAISE EXCEPTION 'Treatment resource conflict' USING ERRCODE='23P01'; END IF;
 END IF;
 RETURN NEW;
END $$`,
`REVOKE ALL ON FUNCTION miniapp_check_booking_resources() FROM PUBLIC`,
`DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='trg_miniapp_booking_resources') THEN
   CREATE CONSTRAINT TRIGGER trg_miniapp_booking_resources AFTER INSERT OR UPDATE ON bookings DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION miniapp_check_booking_resources();
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='trg_miniapp_bed_resources') THEN
   CREATE CONSTRAINT TRIGGER trg_miniapp_bed_resources AFTER INSERT OR UPDATE ON miniapp_booking_beds DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION miniapp_check_booking_resources();
 END IF;
END $$`,
`ALTER TABLE miniapp_booking_beds ENABLE ROW LEVEL SECURITY`,
`ALTER TABLE miniapp_booking_group_members ENABLE ROW LEVEL SECURITY`,
`REVOKE ALL ON TABLE miniapp_booking_beds,miniapp_booking_group_members FROM PUBLIC`,
`DO $$ DECLARE r text; BEGIN FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated') LOOP EXECUTE format('REVOKE ALL ON TABLE miniapp_booking_beds,miniapp_booking_group_members FROM %I',r); END LOOP; END $$`,
`INSERT INTO miniapp_schema_versions(version) VALUES('${version}') ON CONFLICT(version) DO NOTHING`
];
