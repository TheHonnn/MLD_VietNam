import {prisma} from '../dist/lib/prisma.js';
try{
  const templates=await prisma.$queryRaw`SELECT id,name,is_active,
    NULLIF(btrim(background_image_url),'') IS NOT NULL AS has_background,
    NULLIF(btrim(signature_image_url),'') IS NOT NULL AS has_signature,
    NULLIF(btrim(seal_image_url),'') IS NOT NULL AS has_seal
    FROM certificate_templates ORDER BY created_at,id`;
  const [videos]=await prisma.$queryRaw`SELECT count(*)::int AS video_lessons,
    count(*) FILTER(WHERE NULLIF(btrim(video_url),'') IS NOT NULL)::int AS with_media_url FROM course_lessons WHERE lesson_type='VIDEO'`;
  const [policies]=await prisma.$queryRaw`SELECT count(*)::int AS configured,count(*) FILTER(WHERE allow_public_embed)::int AS allowed_public_embeds FROM miniapp_lesson_media_policy`;
  console.log(JSON.stringify({readOnly:true,templates,videos,policies,templateApprovalVerified:false}));
}catch{console.error('Read-only learning content check failed; no data was changed.');process.exitCode=1;}
finally{await prisma.$disconnect();}
