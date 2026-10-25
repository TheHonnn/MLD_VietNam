import type {Row} from './store.js';
import {ApiError} from './errors.js';

export function lessonMediaSource(value:unknown){
  try{
    if(typeof value!=='string')return {valid:false,youtube:false,id:null};
    const url=new URL(value);
    if(url.protocol!=='https:'||url.username||url.password)return {valid:false,youtube:false,id:null};
    const youtube=['youtube.com','www.youtube.com','m.youtube.com','youtu.be','www.youtube-nocookie.com','youtube-nocookie.com'].includes(url.hostname);
    if(!youtube)return {valid:true,youtube:false,id:null};
    let id:string|null=null;
    if(!url.port){
      if(url.hostname==='youtu.be'&&url.pathname.split('/').length===2)id=url.pathname.slice(1);
      else if(url.pathname==='/watch')id=url.searchParams.get('v');
      else{const match=/^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})\/?$/.exec(url.pathname);if(match)id=match[1];}
    }
    return {valid:Boolean(id&&/^[A-Za-z0-9_-]{11}$/.test(id)),youtube,id:id&&/^[A-Za-z0-9_-]{11}$/.test(id)?id:null};
  }catch{return {valid:false,youtube:false,id:null};}
}
export function lessonMedia(row:Row){
  const {allow_public_embed,policy_media_url,...result}=row;
  if(!row.video_url)return {...result,youtube_video_id:null,media_error_code:null};
  const source=lessonMediaSource(row.video_url),allowed=typeof allow_public_embed==='boolean'?(allow_public_embed&&policy_media_url===row.video_url):row.is_free_preview===true;
  const error=!source.valid?'INVALID_VIDEO_SOURCE':source.youtube&&!allowed?'YOUTUBE_NOT_APPROVED':null;
  return {...result,video_url:error?null:row.video_url,youtube_video_id:!error&&source.youtube?source.id:null,media_error_code:error};
}
export function assertLessonMedia(row:Row){
  const media=lessonMedia(row);
  if(media.media_error_code)throw new ApiError(403,'Lesson video is unavailable under its current media policy',{code:media.media_error_code});
  return media;
}
