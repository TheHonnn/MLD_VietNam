export const statements=[
`DO $$ DECLARE existing text; BEGIN
 SELECT pg_get_expr(d.adbin,d.adrelid) INTO existing FROM pg_attribute a
 LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
 WHERE a.attrelid='public.services'::regclass AND a.attname='duration_minutes' AND NOT a.attisdropped;
 IF existing IS NULL THEN ALTER TABLE public.services ALTER COLUMN duration_minutes SET DEFAULT 60;
 ELSIF existing<>'60' THEN RAISE EXCEPTION 'Existing service duration default requires operator review';
 END IF;
END $$`
];
