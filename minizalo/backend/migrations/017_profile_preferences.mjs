// Optional, additive. Run explicitly after database authorization; not part of app startup.
export const statements=[
`ALTER TABLE miniapp_customer_profiles ADD COLUMN IF NOT EXISTS occupation varchar(150) NOT NULL DEFAULT ''`,
`ALTER TABLE miniapp_customer_profiles ADD COLUMN IF NOT EXISTS theme varchar(10) NOT NULL DEFAULT 'LIGHT' CHECK(theme IN ('LIGHT','DARK','SYSTEM'))`,
`ALTER TABLE miniapp_customer_profiles ADD COLUMN IF NOT EXISTS treatment_notify boolean NOT NULL DEFAULT true`,
`ALTER TABLE miniapp_customer_profiles ADD COLUMN IF NOT EXISTS course_notify boolean NOT NULL DEFAULT true`
];
