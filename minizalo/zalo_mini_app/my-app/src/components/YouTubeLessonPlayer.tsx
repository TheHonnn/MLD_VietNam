import React,{forwardRef,useEffect,useImperativeHandle,useRef,useState} from 'react';
import {PlayCircleIcon} from './Icons';

export type LessonPlayerHandle={pause:()=>void;readonly currentTime:number;readonly paused:boolean};
type Player={pauseVideo:()=>void;getCurrentTime:()=>number;getPlayerState:()=>number;getVideoUrl:()=>string;destroy:()=>void;getIframe:()=>HTMLIFrameElement};
type YoutubeApi={Player:new(target:HTMLElement,options:{videoId:string;width:string;height:string;playerVars:Record<string,string|number>;events:{onReady:()=>void;onStateChange:(event:{data:number})=>void;onError:(event:{data:number})=>void}})=>Player};
type YoutubeWindow=Window&{YT?:YoutubeApi;onYouTubeIframeAPIReady?:()=>void};
let apiPromise:Promise<YoutubeApi>|null=null;
function youtubeApi(){
  const owner=window as YoutubeWindow;
  if(owner.YT?.Player)return Promise.resolve(owner.YT);
  if(apiPromise)return apiPromise;
  const pending=new Promise<YoutubeApi>((resolve,reject)=>{
    const previous=owner.onYouTubeIframeAPIReady;
    const existing=document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]');
    const script=existing||document.createElement('script');let finished=false;
    const cleanup=()=>{clearTimeout(timer);script.removeEventListener('error',failed);if(owner.onYouTubeIframeAPIReady===ready)owner.onYouTubeIframeAPIReady=previous;};
    const failed=()=>{if(finished)return;finished=true;cleanup();if(!existing)script.remove();reject(new Error('Không thể kết nối trình phát YouTube.'));};
    const ready=()=>{try{previous?.();}finally{if(!finished&&owner.YT?.Player){finished=true;cleanup();resolve(owner.YT);}}};
    const timer=window.setTimeout(failed,15000);
    owner.onYouTubeIframeAPIReady=ready;script.addEventListener('error',failed,{once:true});
    if(!existing){script.src='https://www.youtube.com/iframe_api';script.async=true;script.referrerPolicy='strict-origin-when-cross-origin';document.head.append(script);}
  });
  apiPromise=pending;void pending.catch(()=>{if(apiPromise===pending)apiPromise=null;});return pending;
}

type Props={videoId:string;title:string;onPlay:()=>void;onPause:()=>void;onEnded:()=>void;onTick:(position:number,playing:boolean)=>void};
export const YouTubeLessonPlayer=forwardRef<LessonPlayerHandle,Props>(function YouTubeLessonPlayer(props,ref){
  const host=useRef<HTMLDivElement>(null),player=useRef<Player|null>(null),ready=useRef(false),callbacks=useRef(props);callbacks.current=props;
  const matchesLesson=()=>{try{const url=new URL(player.current?.getVideoUrl()||'');return ['youtube.com','www.youtube.com'].includes(url.hostname)&&url.searchParams.get('v')===callbacks.current.videoId;}catch{return false;}};
  const [requested,setRequested]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
  useImperativeHandle(ref,()=>({pause(){if(ready.current)player.current?.pauseVideo();},get currentTime(){return ready.current&&matchesLesson()?player.current?.getCurrentTime()||0:0;},get paused(){return !ready.current||!matchesLesson()||player.current?.getPlayerState()!==1;}}),[]);
  useEffect(()=>{
    if(!requested)return;
    let active=true,terminal=false;ready.current=false;setLoading(true);setError('');
    const fail=(message:string)=>{if(!active||terminal)return;terminal=true;ready.current=false;clearTimeout(timeout);try{player.current?.destroy();}catch{/* The iframe may already have been detached by navigation. */}player.current=null;setLoading(false);setError(message);};
    const timeout=window.setTimeout(()=>fail('Trình phát YouTube chưa phản hồi. Vui lòng thử lại.'),20000);
    void youtubeApi().then(api=>{
      if(!active||terminal||!host.current)return;
      const target=document.createElement('div');host.current.replaceChildren(target);
      player.current=new api.Player(target,{videoId:props.videoId,width:'100%',height:'100%',playerVars:{playsinline:1,origin:window.location.origin,enablejsapi:1,autoplay:0,controls:1},events:{
        onReady:()=>{if(!active||terminal)return;ready.current=true;clearTimeout(timeout);setLoading(false);player.current?.getIframe().setAttribute('title',callbacks.current.title);player.current?.getIframe().setAttribute('referrerpolicy','strict-origin-when-cross-origin');},
        onStateChange:event=>{if(!active||terminal||!ready.current)return;if(!matchesLesson()){callbacks.current.onTick(0,false);return;}if(event.data===1)callbacks.current.onPlay();else if(event.data===2)callbacks.current.onPause();else if(event.data===0)callbacks.current.onEnded();else callbacks.current.onTick(player.current?.getCurrentTime()||0,false);},
        onError:event=>fail([100,101,150].includes(event.data)?'Video không còn khả dụng hoặc không cho phép nhúng.':'Không thể phát video YouTube. Vui lòng thử lại.'),
      }});
    }).catch(()=>fail('Không thể kết nối trình phát YouTube.'));
    const timer=window.setInterval(()=>{if(active&&!terminal&&ready.current&&player.current)callbacks.current.onTick(player.current.getCurrentTime(),matchesLesson()&&player.current.getPlayerState()===1);},500);
    return()=>{active=false;ready.current=false;clearTimeout(timeout);clearInterval(timer);try{player.current?.destroy();}catch{/* Native navigation can detach the frame before cleanup. */}player.current=null;};
  },[requested,attempt,props.videoId]);
  return <section className="academy-youtube" aria-label={props.title}>
    {!requested&&<button type="button" className="academy-outline" onClick={()=>setRequested(true)}><PlayCircleIcon size={20}/>Mở video YouTube</button>}
    {loading&&<p role="status">Đang kết nối YouTube...</p>}
    {requested&&<div ref={host} className="academy-youtube-player" hidden={Boolean(error)}/>}
    {error&&<div role="alert"><p>{error}</p><button type="button" className="academy-outline" onClick={()=>setAttempt(value=>value+1)}>Thử lại YouTube</button></div>}
    <div className="academy-youtube-links"><a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer">Điều khoản YouTube</a><a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Chính sách Google</a></div>
  </section>;
});
