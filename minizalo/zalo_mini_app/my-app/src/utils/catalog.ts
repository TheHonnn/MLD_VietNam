export const searchText = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\u0111\u0110]/g, 'd').toLocaleLowerCase('vi').replace(/\s+/g, ' ').trim();

export function serviceSearchText(service:{title?:string;category?:string;description?:string;shortDescription?:string;benefits?:unknown;steps?:unknown}){
  const content=(value:unknown):string=>typeof value==='string'?value:Array.isArray(value)?value.map(content).join(' '):value&&typeof value==='object'?['title','name','description','desc','content','text'].map(key=>typeof (value as Record<string,unknown>)[key]==='string'?(value as Record<string,string>)[key]:'').join(' '):'';
  return searchText([service.title,service.category,service.description,service.shortDescription,content(service.benefits),content(service.steps)].filter(Boolean).join(' '));
}

export const vietnamToday = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());
