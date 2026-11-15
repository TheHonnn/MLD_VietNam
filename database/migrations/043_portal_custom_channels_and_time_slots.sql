-- ------------------------------------------------------------------------------
-- MIGRATION 043: PORTAL CUSTOM CONTACT CHANNELS AND TIME SLOTS RANGE
-- ------------------------------------------------------------------------------

INSERT INTO public.portal_taxonomies (id, type, code, name, description, icon_name, sort_order, is_active)
VALUES 
    ('cc000000-0001-0001-0001-000000000001', 'CONTACT_CHANNEL', 'HOTLINE', 'Hotline CSKH & Đặt lịch', '096.7786.399', 'phone', 1, TRUE),
    ('cc000000-0001-0001-0001-000000000002', 'CONTACT_CHANNEL', 'ZALO', 'Zalo Official Account', 'https://zalo.me/1424469774232439257?src=qr', 'zalo', 2, TRUE),
    ('cc000000-0001-0001-0001-000000000003', 'CONTACT_CHANNEL', 'FACEBOOK', 'Facebook Fanpage', 'https://facebook.com/hebachhuyet.mldvietnam', 'facebook', 3, TRUE),
    ('cc000000-0001-0001-0001-000000000004', 'CONTACT_CHANNEL', 'MESSENGER', 'Messenger Fanpage', 'https://m.me/hebachhuyet.mldvietnam', 'messenger', 4, TRUE),
    ('cc000000-0001-0001-0001-000000000005', 'CONTACT_CHANNEL', 'TIKTOK', 'TikTok Official', 'https://www.tiktok.com/@trungtamgiamphu', 'tiktok', 5, TRUE),
    ('cc000000-0001-0001-0001-000000000006', 'CONTACT_CHANNEL', 'YOUTUBE', 'Kênh YouTube MLD', 'https://www.youtube.com/@mldvietnam', 'youtube', 6, TRUE),
    ('cc000000-0001-0001-0001-000000000007', 'CONTACT_CHANNEL', 'WEBSITE', 'Website MLD Việt Nam', 'https://mldvietnam.com', 'globe', 7, TRUE)
ON CONFLICT (id) DO UPDATE 
SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon_name = EXCLUDED.icon_name,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

UPDATE public.branches
SET amenities = array_append(
    array_remove(amenities, 'SLOTS:08:30,10:00,14:00,16:00,18:00,19:30'),
    'SLOTS:08:00 - 09:00,09:00 - 10:00,10:00 - 11:00,14:00 - 15:00,15:00 - 16:00,17:00 - 18:00,18:00 - 19:00,19:00 - 20:00'
)
WHERE id = 'aaaaaaaa-0001-0001-0001-000000000001';
