'use strict';
/* ---------- dados de referência ---------- */
const CATS = [
  ['moradia','Moradia','ess',0],['contas','Contas da casa','ess',.08],['mercado','Mercado','ess',.12],
  ['transporte','Transporte','ess',.15],['saude','Saúde','ess',0],['educacao','Educação','ess',0],
  ['delivery','Restaurantes e delivery','est',.5],['lazer','Lazer','est',.4],['compras','Compras','est',.4],
  ['assinaturas','Assinaturas','est',.5],['beleza','Beleza e cuidados','est',.3],['pets','Pets','est',.15],
  ['presentes','Presentes','est',.3],['viagens','Viagens','est',.5],['outros','Outros','est',.3]
];
const CAT = Object.fromEntries(CATS.map(c=>[c[0],{id:c[0],nome:c[1],g:c[2],corte:c[3]}]));
CAT.renda = {id:'renda',nome:'Renda extra',g:'rec',corte:0};
const PESSOAS = {p1:'Pessoa 1',p2:'Pessoa 2',casal:'Casal'};
/* nomes editáveis em Ajustes; as chaves internas (p1/p2) continuam as mesmas nos dados */
function syncNames(){ const n=(S&&S.cfg&&S.cfg.nomes)||{}; PESSOAS.p1=(n.p1||'').trim()||'Pessoa 1'; PESSOAS.p2=(n.p2||'').trim()||'Pessoa 2'; }
const P1=()=>PESSOAS.p1, P2=()=>PESSOAS.p2;
const FORMAS = {pix:'Pix',debito:'Débito',credito:'Cartão de crédito',dinheiro:'Dinheiro',boleto:'Boleto'};
const PALAVRAS = [
  [/ifood|rappi|delivery|restaurante|lanche|pizza|hamburg|bar |padaria|caf[eé]/i,'delivery'],
  [/uber|99|gasolina|combust|posto|estacion|ped[aá]gio|[ôo]nibus|metr[ôo]|ipva|oficina/i,'transporte'],
  [/mercado|supermerc|atacad|assa[ií]|carrefour|hortifruti|a[çc]ougue|feira/i,'mercado'],
  [/farm[aá]cia|drogaria|m[eé]dic|consulta|exame|dentista|academia|plano de sa[uú]de/i,'saude'],
  [/netflix|spotify|disney|prime|hbo|max |youtube|icloud|google one|assinatura|globoplay/i,'assinaturas'],
  [/aluguel|condom[ií]nio|iptu|financiamento/i,'moradia'],
  [/luz|energia|enel|light|[aá]gua|cedae|g[aá]s|internet|claro|vivo|tim|oi /i,'contas'],
  [/cinema|show|ingresso|passeio|parque|jogo/i,'lazer'],
  [/roupa|shopee|shein|amazon|magalu|mercado livre|loja|cal[çc]ado|t[eê]nis/i,'compras'],
  [/sal[aã]o|cabelo|unha|barbear|manicure|cosm[eé]t|perfum/i,'beleza'],
  [/ra[çc][aã]o|pet|veterin/i,'pets'],[/presente|anivers/i,'presentes'],
  [/passage|hotel|airbnb|viagem|hospedag/i,'viagens'],[/escola|curso|faculdade|livro|mensalidade/i,'educacao']
];
const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const ICON = {good:'✓',warn:'!',serious:'!',crit:'✕',info:'i'};
const VIEWS_OK = ['resumo','lancamentos','contas','historico','metas','ajustes'];

/* ---------- utilidades ---------- */
const $ = s=>document.querySelector(s);
const esc = s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const brl2 = new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const brl0 = new Intl.NumberFormat('pt-BR',{maximumFractionDigits:0});
const fmt = v=>(v<-0.004?'−':'')+'R$ '+brl2.format(Math.abs(v||0));
const fmt0 = v=>(v<-0.5?'−':'')+'R$ '+brl0.format(Math.abs(Math.round(v||0)));
const pct = p=>(isFinite(p)?Math.round(p*100):0)+'%';
const r10 = v=>Math.ceil(v/10)*10;
const num = v=>+v||0;
function parseMoney(s){
  s = String(s??'').trim().replace(/R\$|\s/g,'');
  if(!s) return NaN;
  if(s.includes(',')) s = s.replace(/\./g,'').replace(',','.');
  else if(/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g,'');
  return Number(s);
}
const pad = n=>String(n).padStart(2,'0');
function curYM(){const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1);}
function today(){const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function addM(m,n){let [y,mo]=m.split('-').map(Number);mo+=n;y+=Math.floor((mo-1)/12);mo=((mo-1)%12+12)%12+1;return y+'-'+pad(mo);}
function diffM(a,b){const [y1,m1]=a.split('-').map(Number),[y2,m2]=b.split('-').map(Number);return (y2-y1)*12+(m2-m1);}
function labelLong(m){const [y,mo]=m.split('-').map(Number);return MESES[mo-1]+' '+y;}
function labelShort(m){const [y,mo]=m.split('-').map(Number);return MESES[mo-1].slice(0,3)+'/'+String(y).slice(2);}
function daysIn(m){const [y,mo]=m.split('-').map(Number);return new Date(y,mo,0).getDate();}
const catName = id=>CAT[id]?.nome||'Outros';
const catGroup = id=>CAT[id]?.g||'est';
const chip = (st,text)=>`<span class="chip st-${st}"><i aria-hidden="true">${ICON[st]}</i>${esc(text)}</span>`;
const newId = ()=>'x'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const ymd = d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const dm = d=>d?d.slice(8,10)+'/'+d.slice(5,7):'';
function easter(y){const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),x=h+l-7*m+114;return new Date(y,Math.floor(x/31)-1,(x%31)+1);}
const holCache={};
/* feriados nacionais + Carnaval, Sexta-feira Santa e Corpus Christi (bancos fechados) */
function holidays(y){
  if(holCache[y]) return holCache[y];
  const set=new Set(['01-01','04-21','05-01','09-07','10-12','11-02','11-15','11-20','12-25'].map(d=>y+'-'+d));
  const e=easter(y); for(const n of [-48,-47,-2,60]){const d=new Date(e);d.setDate(d.getDate()+n);set.add(ymd(d));}
  return holCache[y]=set;
}
function isBiz(d,sab){const w=d.getDay(); if(w===0||(w===6&&!sab)) return false; return !holidays(d.getFullYear()).has(ymd(d));}
function nthBizDay(m,n,sab){const [y,mo]=m.split('-').map(Number);let c=0;for(let d=1;d<=daysIn(m);d++){const dt=new Date(y,mo-1,d);if(isBiz(dt,sab)&&++c===n) return ymd(dt);}return m+'-'+pad(daysIn(m));}
function fixedDayAdj(m,day){const [y,mo]=m.split('-').map(Number);const dt=new Date(y,mo-1,Math.min(Math.max(1,day),daysIn(m)));let g=0;while(!isBiz(dt,false)&&g++<10) dt.setDate(dt.getDate()-1);return ymd(dt);}
function payDate(f,m,sab){return f.quando==='dia'?fixedDayAdj(m,num(f.dia)||20):nthBizDay(m,5,sab??(S.cfg.sabadoUtil===true));}
const whenTxt = f=>f.quando==='dia'?'todo dia '+(num(f.dia)||20):'5º dia útil';
function paidDefault(m,day){const cm=curYM(); if(m>=cm) return today(); return m+'-'+pad(Math.min(Math.max(1,day||daysIn(m)),daysIn(m)));}

/* ---------- estado ---------- */
const blank = ()=>({cfg:{fontes:[],salarios:{},sabadoUtil:false,saldoInicial:0,inicio:'',limites:{}},lanc:[],fixas:[],metas:[],aportes:[],receb:[]});
let real = blank(), demo = null, S = real;
let mode = 'loading', baseMode = 'local', cfgExists = false;
let canWrite = true, loadNote = '';
let month = curYM();
let view = VIEWS_OK.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'resumo';
const ui = {quem:'todos', busca:'', chart:(()=>{try{return localStorage.getItem('financas-grafico')||'pizza';}catch(e){return 'pizza';}})()};
let memo = new Map();

/* ---------- cálculos ---------- */
function monthItems(m){
  const out=[];
  for(const t of S.lanc){
    if(!t.data) continue;
    const tm=t.data.slice(0,7);
    if(t.tipo==='receita'){ if(tm===m) out.push({k:'rec',v:num(t.valor),cat:'renda',quem:t.quem||'casal',t}); continue; }
    const n=Math.max(1,parseInt(t.parcelas)||1);
    const start=(t.forma==='credito'&&t.mesFatura)?t.mesFatura:tm;
    const i=diffM(start,m);
    if(i<0||i>=n) continue;
    out.push({k:n>1?'parc':'var',v:num(t.valor)/n,cat:t.cat,quem:t.quem||'casal',t,i,n});
  }
  for(const f of S.fixas){
    if(f.ativo===false) continue;
    if(f.inicio&&f.inicio>m) continue;
    if(f.fim&&f.fim<m) continue;
    out.push({k:'fixa',v:num(f.valor),cat:f.cat,quem:f.quem||'casal',f});
  }
  return out;
}
function fontes(){
  const f=S.cfg.fontes; if(Array.isArray(f)&&f.length) return f;
  const s=S.cfg.salarios||{}, out=[];
  if(num(s.p1)) out.push({id:'sal-p1',nome:'Salário',quem:'p1',quando:'5du',valor:num(s.p1)});
  if(num(s.p2)) out.push({id:'sal-p2',nome:'Salário',quem:'p2',quando:'5du',valor:num(s.p2)});
  return out;
}
function salTotal(){return fontes().reduce((a,f)=>a+num(f.valor),0);}
function startMonth(){
  if(memo.has('start')) return memo.get('start');
  let st=S.cfg.inicio||'';
  if(!st){ const c=[...S.receb.map(r=>r.mes),...S.lanc.filter(t=>t.data&&(parseInt(t.parcelas)||1)<=1).map(t=>t.data.slice(0,7)),...S.aportes.map(a=>a.mes)].filter(Boolean).sort(); st=c[0]||curYM(); }
  memo.set('start',st); return st;
}
function summary(m){
  if(memo.has(m)) return memo.get(m);
  const it=monthItems(m);
  const s={m,extra:0,fixa:0,parc:0,var:0,cat:{},quem:{},ess:0,est:0,items:it,rec:[],pend:[],late:[],recebido:0,prevPend:0};
  const fs=fontes(), st=startMonth();
  const cmS=curYM(), hojeS=today();
  for(const f of fs){ const r=S.receb.find(x=>x.fonte===f.id&&x.mes===m); if(r){s.rec.push({f,r});s.recebido+=num(r.valor);} else if(m>=st){ const d=payDate(f,m); if(m>cmS||(m===cmS&&d>=hojeS)){s.pend.push(f);s.prevPend+=num(f.valor);} else s.late.push(f); } }
  for(const r of S.receb) if(r.mes===m&&!fs.some(f=>f.id===r.fonte)){ s.rec.push({f:{id:r.fonte,nome:r.nome||'Salário',quem:r.quem||'casal'},r}); s.recebido+=num(r.valor); }
  for(const x of it){
    if(x.k==='rec'){s.extra+=x.v;continue;}
    s[x.k]+=x.v;
    const c=s.cat[x.cat]||(s.cat[x.cat]={fixa:0,parc:0,var:0});c[x.k]+=x.v;
    const q=s.quem[x.quem]||(s.quem[x.quem]={fixa:0,parc:0,var:0});q[x.k]+=x.v;
    if(catGroup(x.cat)==='ess') s.ess+=x.v; else s.est+=x.v;
  }
  s.sal=s.recebido+s.prevPend; s.renda=s.sal+s.extra; s.rendaReal=s.recebido+s.extra;
  s.gastos=s.fixa+s.parc+s.var;
  s.guardado=S.aportes.filter(a=>a.mes===m).reduce((a,b)=>a+num(b.valor),0);
  s.livre=s.renda-s.gastos-s.guardado;
  memo.set(m,s); return s;
}
/* sobra usada no saldo: em meses futuros desconta o dia a dia médio ainda não lançado */
function livreProj(p){const q=summary(p); return p>curYM()?q.livre-Math.max(0,planBase().var-q.var):q.livre;}
/* saldo: o saldo informado em Ajustes + o que entrou e saiu de verdade depois dele (extrato) */
function saldoBase(){
  const st=startMonth(), c=S.cfg;
  if(c.saldoData) return {v:num(c.saldoInicial),d:c.saldoData,modo:c.saldoModo||'fim',em:num(c.saldoEm)};
  return {v:num(c.saldoInicial),d:st+'-01',modo:'inicio',em:0};
}
function ledger(upto){
  const key='led:'+upto; if(memo.has(key)) return memo.get(key);
  const B=saldoBase(); let v=B.v;
  const ok=(d,criado)=>!!d&&d<=upto&&(d>B.d||(d===B.d&&(B.modo==='inicio'||(B.modo==='agora'&&(!criado||num(criado)>B.em)))));
  for(const r of S.receb) if(ok(r.data,r.criado)) v+=num(r.valor);
  for(const t of S.lanc){
    if(!t.data) continue;
    if(t.tipo==='receita'){ if(ok(t.data,t.criado)) v+=num(t.valor); continue; }
    if(t.forma==='credito'){ const n=Math.max(1,parseInt(t.parcelas)||1); for(const [m,p] of Object.entries(t.pagas||{})){ if(!p) continue; const d=typeof p==='string'&&p?p:m+'-10'; if(ok(d)) v-=num(t.valor)/n; } }
    else if(ok(t.data,t.criado)) v-=num(t.valor);
  }
  for(const f of S.fixas) for(const [m,p] of Object.entries(f.pagas||{})){ if(!p) continue; const d=typeof p==='string'&&p?p:m+'-'+pad(Math.min(num(f.dia)||1,daysIn(m))); if(ok(d)) v-=num(f.valor); }
  for(const a of S.aportes){ const d=a.criado?ymd(new Date(num(a.criado))):(a.mes||'')+'-01'; if(ok(d,a.criado)) v-=num(a.valor); }
  memo.set(key,v); return v;
}
/* previsto para o fim do mês atual: saldo de hoje + o que ainda vai entrar − o que ainda falta pagar */
function previstoFim(){
  if(memo.has('pf')) return memo.get('pf');
  const cm=curYM(), s=summary(cm), hoje=today(), B=saldoBase();
  let inn=s.prevPend, out=0;
  for(const x of s.items){
    if(x.k==='rec'){ if(x.t.data>hoje) inn+=x.v; continue; }
    if(x.k==='fixa'){ if(x.f.pagas?.[cm]) continue; const due=cm+'-'+pad(Math.min(num(x.f.dia)||daysIn(cm),daysIn(cm))); if(due<B.d) continue; out+=x.v; }
    else if(x.t.forma==='credito'){ if(!x.t.pagas?.[cm]) out+=x.v; }
    else if(x.t.data>hoje) out+=x.v;
  }
  const h=ledger(hoje), r={hoje:h,inn,out,fim:h+inn-out}; memo.set('pf',r); return r;
}
function saldoFinal(m){
  const key='saldo:'+m; if(memo.has(key)) return memo.get(key);
  const cm=curYM(); let v;
  if(m<cm) v=ledger(m+'-'+pad(daysIn(m)));
  else if(m===cm) v=previstoFim().fim;
  else v=saldoFinal(addM(m,-1))+livreProj(m);
  memo.set(key,v); return v;
}
/* data de pagamento de um item no mês (null = ainda não pago) */
function itemPaid(x,m){
  if(x.k==='fixa'){const p=x.f.pagas?.[m]; return p?(typeof p==='string'?p:''):null;}
  if(x.k==='rec') return x.t.data;
  if(x.t.forma==='credito'){const p=x.t.pagas?.[m]; return p?(typeof p==='string'?p:''):null;}
  return x.t.data;
}
/* média do "dia a dia" nos 3 meses anteriores com lançamentos */
function baseline(m){
  const key='base:'+m; if(memo.has(key)) return memo.get(key);
  const ms=[];
  for(let i=1;i<=6&&ms.length<3;i++){const s=summary(addM(m,-i)); if(s.var>0) ms.push(s);}
  let r=null;
  if(ms.length){
    const cat={}; let tot=0;
    for(const s of ms){tot+=s.var; for(const [c,v] of Object.entries(s.cat)) cat[c]=(cat[c]||0)+v.var;}
    for(const c in cat) cat[c]/=ms.length;
    r={var:tot/ms.length,cat,n:ms.length};
  }
  memo.set(key,r); return r;
}
/* base para planejar a partir de hoje */
function planBase(){
  if(memo.has('pb')) return memo.get('pb');
  const cm=curYM(); let b=baseline(cm);
  if(!b){
    const s=summary(cm); const frac=Math.max(.25,new Date().getDate()/daysIn(cm));
    const cat={}; for(const [c,v] of Object.entries(s.cat)) if(v.var) cat[c]=v.var/frac;
    b={var:s.var/frac,cat,n:0,estimado:true};
  }
  memo.set('pb',b); return b;
}
function capMonth(p){const s=summary(p);return s.sal-s.fixa-s.parc-planBase().var;}
function goalSaved(g){return num(g.inicial)+S.aportes.filter(a=>a.meta===g.id).reduce((a,b)=>a+num(b.valor),0);}
function goalRest(g){return Math.max(0,num(g.valor)-goalSaved(g));}
function goalMonths(g){return Math.max(1,diffM(curYM(),g.prazo||addM(curYM(),12))+1);}
function cutOptions(){
  const B=planBase();
  return Object.entries(B.cat).map(([c,v])=>({c,atual:v,corte:Math.floor(v*(CAT[c]?.corte??.3)/10)*10}))
    .filter(x=>x.corte>=10)
    .sort((a,b)=>(catGroup(a.c)===catGroup(b.c)?b.corte-a.corte:(catGroup(a.c)==='est'?-1:1)));
}
function pickCuts(list,gap){
  const out=[]; let rest=gap;
  for(const x of list){ if(rest<=0.5) break; const take=Math.min(x.corte,r10(rest)); out.push({...x,corte:take,novo:x.atual-take}); rest-=take; }
  return out;
}
function splitBySalary(v){
  const fs=fontes(), r=fs.filter(f=>f.quem==='p1').reduce((a,f)=>a+num(f.valor),0), t=fs.filter(f=>f.quem==='p2').reduce((a,f)=>a+num(f.valor),0), tot=r+t;
  if(!tot) return null; return {p1:v*r/tot,p2:v*t/tot};
}
function planGoal(g){
  const key='plan:'+g.id; if(memo.has(key)) return memo.get(key);
  const cm=curYM(), saved=goalSaved(g), valor=num(g.valor), rest=Math.max(0,valor-saved);
  let P;
  if(rest<=0){ P={done:true,saved,valor,rest:0,status:'done'}; memo.set(key,P); return P; }
  const prazo=g.prazo||addM(cm,12), late=prazo<cm, meses=goalMonths(g), porMes=rest/meses;
  const others=S.metas.filter(o=>o.id!==g.id&&goalRest(o)>0&&(o.prazo||'9999')>=cm);
  const dispAt=p=>{let c=capMonth(p); for(const o of others){ if((o.prazo||'9999')>=p) c-=goalRest(o)/goalMonths(o);} return c;};
  let sumDisp=0; for(let i=0;i<meses;i++) sumDisp+=Math.max(0,dispAt(addM(cm,i)));
  const avgDisp=sumDisp/meses;
  const all=cutOptions(), allTot=all.reduce((a,c)=>a+c.corte,0);
  let status, cuts=[], gapMes=0, faltaMes=0, novaData=null, antes=null;
  if(sumDisp>=rest){
    status = porMes>0.8*avgDisp?'apertado':'ok';
    cuts = all.slice(0,3).map(x=>({...x,novo:x.atual-x.corte}));
    const extra=cuts.reduce((a,c)=>a+c.corte,0);
    if(extra>0){const k=Math.ceil(rest/(porMes+extra)); if(k<meses) antes=addM(cm,k-1);}
  } else {
    gapMes=(rest-sumDisp)/meses;
    cuts=pickCuts(all,gapMes);
    const tot=cuts.reduce((a,c)=>a+c.corte,0);
    if(tot>=gapMes-0.5) status='cortes';
    else {
      status='inviavel'; faltaMes=gapMes-tot;
      let acc=0; for(let k=0;k<240;k++){const p=addM(cm,k); acc+=Math.max(0,dispAt(p))+allTot; if(acc>=rest){novaData=p;break;}}
    }
  }
  P={done:false,saved,valor,rest,prazo,late,meses,porMes,avgDisp,sumDisp,status,cuts,gapMes,faltaMes,novaData,antes,split:splitBySalary(porMes)};
  memo.set(key,P); return P;
}
const GOAL_ST = {
  ok:['good','No caminho'], apertado:['warn','Cabe, mas apertado'], cortes:['serious','Precisa de cortes'],
  inviavel:['crit','Não cabe no prazo'], done:['good','Meta alcançada']
};

/* ---------- persistência ----------
   Três modos: 'db' (Supabase, com login e sincronização ao vivo), 'local' (só neste navegador)
   e 'demo' (dados de exemplo em memória). Toda escrita atualiza a tela na hora e depois grava. */
const CFG = window.FINANCAS_CONFIG || {};
const HAS_CLOUD = !!(CFG.supabaseUrl && CFG.supabaseAnonKey && window.supabase);
const LS_KEY = 'financas-dados';
let sb = null, session = null, channel = null, cloudStarted = false;

function persistLocal(){ if(mode!=='local') return; try{localStorage.setItem(LS_KEY,JSON.stringify(real));}catch(e){} }
function applyLocal(col,obj){ const arr=S[col]; const i=arr.findIndex(x=>x.id===obj.id); if(i>=0) arr[i]=obj; else arr.push(obj); }
function cloudError(error){ const st=error?.status||0, code=error?.code||''; return {code: st===401||/jwt/i.test(error?.message||'')?'auth': code==='42501'||st===403?'invalid_argument': 'unavailable', message:error?.message}; }
async function cloudUpsert(rows){ const {error}=await sb.from('docs').upsert(rows.map(r=>({...r,updated_at:new Date().toISOString()}))); if(error){ loadAll(); throw cloudError(error); } }

async function saveDoc(col,obj){
  obj=JSON.parse(JSON.stringify({...obj}));
  if(!obj.id) obj.id=newId();
  applyLocal(col,obj); memo.clear(); persistLocal(); render();
  if(mode==='db'){ const {id,...data}=obj; await cloudUpsert([{col,id,data}]); }
  return obj.id;
}
async function delDoc(col,id){
  S[col]=S[col].filter(x=>x.id!==id); memo.clear(); persistLocal(); render();
  if(mode==='db'){ const {error}=await sb.from('docs').delete().eq('col',col).eq('id',id); if(error){ loadAll(); throw cloudError(error); } }
}
async function saveCfg(cfg){
  cfg=JSON.parse(JSON.stringify(cfg)); S.cfg=cfg; cfgExists=true; memo.clear(); persistLocal(); render();
  if(mode==='db') await cloudUpsert([{col:'config',id:'main',data:cfg}]);
}
function writeErr(e){
  const c=e?.code;
  if(c==='auth') toast('Sua sessão expirou. Entre de novo para salvar.');
  else if(c==='invalid_argument') toast('Sem permissão para salvar. Confira se você está conectado.');
  else toast('Não foi possível salvar agora. Confira a internet e tente de novo.');
}
async function safe(fn){ try{ await fn(); return true; }catch(e){ console.warn(e); writeErr(e); return false; } }

/* ---------- carregamento ---------- */
function normCfg(d){ d=d||{}; return {fontes:Array.isArray(d.fontes)?d.fontes:[],salarios:{...(d.salarios||{})},sabadoUtil:d.sabadoUtil===true,saldoInicial:num(d.saldoInicial),saldoData:d.saldoData||'',saldoEm:num(d.saldoEm),saldoModo:d.saldoModo||'',inicio:d.inicio||'',nomes:{...(d.nomes||{})},limites:{...(d.limites||{})}}; }
async function init(){
  render();
  if(!HAS_CLOUD){ startLocal('Modo local: os dados ficam só neste navegador. Configure o Supabase (veja o README) para ter login e sincronizar entre aparelhos.'); return; }
  sb=window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  sb.auth.onAuthStateChange((event,s)=>{
    if(event==='PASSWORD_RECOVERY'){ session=s; showLogin('nova'); return; }
    if(event==='SIGNED_OUT'){ session=null; stopCloud(); showLogin('entrar'); return; }
    if(s){ session=s; if(!cloudStarted&&$('#login').dataset.step!=='nova') startCloud(); }
  });
  const {data}=await sb.auth.getSession();
  if(data.session){ session=data.session; startCloud(); } else if(!session) showLogin('entrar');
}
function startLocal(note){
  mode='local'; baseMode='local'; loadNote=note;
  try{ const raw=localStorage.getItem(LS_KEY); if(raw){ const d=JSON.parse(raw); real={...blank(),...d,cfg:normCfg(d.cfg)}; cfgExists=true; } }catch(e){}
  S=real;
  if(isEmpty()) enterDemo(); else render();
}
function isEmpty(){ return !cfgExists && ['lanc','fixas','metas','aportes','receb'].every(c=>real[c].length===0); }
async function startCloud(){
  if(cloudStarted) return; cloudStarted=true; hideLogin();
  mode='loading'; baseMode='db'; loadNote=''; render();
  channel=sb.channel('docs-sync').on('postgres_changes',{event:'*',schema:'public',table:'docs'},onRemoteChange).subscribe();
  await loadAll(true);
}
function stopCloud(){ cloudStarted=false; if(channel){ sb.removeChannel(channel); channel=null; } real=blank(); S=real; cfgExists=false; mode='loading'; }
async function loadAll(first){
  if(!sb||!session) return;
  const rows=[]; const page=1000;
  for(let from=0;;from+=page){
    const {data,error}=await sb.from('docs').select('col,id,data').order('col').order('id').range(from,from+page-1);
    if(error){ loadNote='Não consegui carregar os dados. Confira a internet; a página tenta de novo quando você voltar para ela.'; if(mode==='loading') mode='db'; render(); return; }
    rows.push(...data); if(data.length<page) break;
  }
  const r=blank(); cfgExists=false;
  for(const row of rows){ if(row.col==='config'){ if(row.id==='main'){ cfgExists=true; r.cfg=normCfg(row.data); } } else if(r[row.col]) r[row.col].push({...row.data,id:row.id}); }
  real=r; if(mode!=='demo') S=real; loadNote=''; memo.clear();
  if(first&&isEmpty()){ enterDemo(); return; }
  if(mode==='loading') mode='db';
  render();
}
function onRemoteChange(p){
  const row=p.eventType==='DELETE'?p.old:p.new; if(!row||!row.col) return;
  if(row.col==='config'){ if(p.eventType!=='DELETE'&&row.id==='main'){ cfgExists=true; real.cfg=normCfg(row.data); } }
  else if(real[row.col]){
    const arr=real[row.col], i=arr.findIndex(x=>x.id===row.id);
    if(p.eventType==='DELETE'){ if(i>=0) arr.splice(i,1); }
    else { const o={...row.data,id:row.id}; if(i>=0) arr[i]=o; else arr.push(o); }
  }
  memo.clear(); if(mode!=='loading'&&$('#sheet').hidden) render();
}
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible'&&mode==='db') loadAll(false); });
function enterDemo(){ demo=buildDemo(); S=demo; mode='demo'; memo.clear(); render(); }
function exitDemo(){ S=real; mode=baseMode; memo.clear(); }

/* ---------- login ---------- */
function showLogin(step){
  const el=$('#login'); el.dataset.step=step; el.hidden=false; document.body.classList.add('locked');
  $('#loginTitle').textContent = step==='nova'?'Criar nova senha':'Entrar';
  $('#loginForm').innerHTML = step==='nova'
    ? `<label>Nova senha<input id="l-pass" name="senha" type="password" autocomplete="new-password" minlength="6" required></label>
       <button type="submit" class="btn">Salvar nova senha</button>`
    : `<label>E-mail<input id="l-email" name="email" type="email" autocomplete="email" inputmode="email" required></label>
       <label>Senha<input id="l-pass" name="senha" type="password" autocomplete="current-password" required></label>
       <button type="submit" class="btn">Entrar</button>
       <button type="button" class="linkbtn" data-act="forgot">Esqueci minha senha</button>`;
  $('#loginMsg').textContent='';
  setTimeout(()=>$('#loginForm input')?.focus(),50);
}
function hideLogin(){ $('#login').hidden=true; document.body.classList.remove('locked'); }
async function loginSubmit(e){
  e.preventDefault(); const f=e.target, btn=f.querySelector('[type=submit]'), msg=$('#loginMsg'); btn.disabled=true; msg.textContent='';
  try{
    if($('#login').dataset.step==='nova'){
      const {error}=await sb.auth.updateUser({password:f.senha.value}); if(error) throw error;
      $('#login').dataset.step=''; toast('Senha alterada.'); startCloud();
    } else {
      const {error}=await sb.auth.signInWithPassword({email:f.email.value.trim(),password:f.senha.value});
      if(error) throw error;
    }
  }catch(err){
    msg.textContent = /invalid login/i.test(err.message||'') ? 'E-mail ou senha incorretos.' : /fetch|network/i.test(err.message||'') ? 'Sem conexão com a internet.' : 'Não foi possível entrar: '+(err.message||'erro desconhecido');
  }
  btn.disabled=false;
}
async function forgotPassword(){
  const email=($('#l-email')?.value||'').trim(); const msg=$('#loginMsg');
  if(!email){ msg.textContent='Digite seu e-mail acima e toque de novo em “Esqueci minha senha”.'; return; }
  const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
  msg.textContent = error ? 'Não foi possível enviar o e-mail agora.' : 'Se esse e-mail tiver acesso, chegará um link para criar uma nova senha.';
}

/* ---------- backup ---------- */
function migrateKeys(d){
  // backups da primeira versão (feita no Claude) usavam o nome de cada pessoa como chave
  const OLD1='rod'+'rigo', OLD2='tha'+'iz';
  const txt=JSON.stringify(d); if(!txt.includes('"'+OLD1+'"')&&!txt.includes('"'+OLD2+'"')&&!txt.includes('sal-'+OLD1)) return d;
  const out=JSON.parse(txt.split('"'+OLD1+'"').join('"p1"').split('"'+OLD2+'"').join('"p2"').split('sal-'+OLD1).join('sal-p1').split('sal-'+OLD2).join('sal-p2'));
  out.cfg=out.cfg||{}; out.cfg.nomes={p1:'Rodrigo',p2:'Thaiz',...(out.cfg.nomes||{})};
  return out;
}
async function importBackup(text){
  let d; try{ d=JSON.parse(text); }catch(e){ return 'O texto colado não é um backup válido.'; }
  d=migrateKeys(d);
  const cols=['lanc','fixas','metas','aportes','receb'];
  if(!d.cfg&&!cols.some(c=>Array.isArray(d[c]))) return 'Não encontrei dados de finanças nesse backup.';
  if(mode==='demo') exitDemo();
  const cfg=normCfg(d.cfg);
  const rows=[{col:'config',id:'main',data:cfg}];
  for(const c of cols) for(const o of (d[c]||[])){ if(!o||!o.id) continue; const {id,...data}=o; rows.push({col:c,id:String(id),data}); }
  real.cfg=cfg; cfgExists=true;
  for(const c of cols){ for(const o of (d[c]||[])) if(o&&o.id){ const i=real[c].findIndex(x=>x.id===String(o.id)); const v={...o,id:String(o.id)}; if(i>=0) real[c][i]=v; else real[c].push(v); } }
  S=real; memo.clear(); persistLocal(); render();
  if(mode==='db'){ for(let i=0;i<rows.length;i+=500) await cloudUpsert(rows.slice(i,i+500)); }
  return true;
}
function downloadBackup(){
  const blob=new Blob([JSON.stringify({exportado:new Date().toISOString(),...S},null,1)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`financas-backup-${today()}.json`; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);
}
function importForm(){
  openSheet('Importar backup',`
    <div class="hint">Cole aqui o backup (o texto JSON copiado em “Copiar backup”) ou escolha o arquivo baixado. Lançamentos com o mesmo código são atualizados; nada é apagado.</div>
    <label>Arquivo<input type="file" id="imp-file" accept="application/json,.json"></label>
    <label>Ou cole o texto<textarea name="txt" id="imp-txt" rows="6" style="font-size:13px;font-family:ui-monospace,monospace"></textarea></label>`,
  async fd=>{ const r=await importBackup(fd.get('txt')||''); if(r===true){ toast('Backup importado.'); return true; } return r; });
  $('#imp-file').addEventListener('change',async e=>{ const f=e.target.files[0]; if(f) $('#imp-txt').value=await f.text(); });
}

/* ---------- dados de exemplo (só na memória) ---------- */
function buildDemo(){
  const cm=curYM(), hoje=today(), dHoje=new Date().getDate(); let seed=11; const rnd=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646;};
  const pick=a=>a[Math.floor(rnd()*a.length)];
  const D={cfg:{fontes:[{id:'fr1',nome:'Salário',quem:'p1',quando:'5du',valor:4300},{id:'fr2',nome:'Adiantamento',quem:'p1',quando:'dia',dia:20,valor:2500},{id:'ft1',nome:'Salário',quem:'p2',quando:'5du',valor:5200}],
    salarios:{},nomes:{p1:'Ana',p2:'Lucas'},sabadoUtil:false,saldoInicial:1500,inicio:addM(cm,-5),limites:{delivery:700,lazer:400,compras:500,mercado:1500}},lanc:[],fixas:[],metas:[],aportes:[],receb:[]};
  let n=0; const id=p=>p+(++n);
  const ini=addM(cm,-6);
  D.fixas=[['Aluguel','moradia',2200,'casal',5],['Condomínio','moradia',480,'casal',10],['Luz','contas',230,'casal',15],
    ['Internet e celulares','contas',210,'casal',20],['Plano de saúde','saude',690,'casal',8],['Academia','saude',180,'p2',5],
    ['Streaming','assinaturas',95,'p1',12],['Curso de inglês','educacao',390,'p1',10]]
    .map(([nome,cat,valor,quem,dia])=>{const pagas={};for(let k=-6;k<0;k++){const m=addM(cm,k);pagas[m]=m+'-'+pad(Math.max(1,dia-1));} if(dia<dHoje&&nome!=='Luz') pagas[cm]=cm+'-'+pad(Math.max(1,dia-1)); return {id:id('f'),nome,cat,valor,quem,dia,inicio:ini,ativo:true,pagas};});
  D.lanc.push({id:id('l'),tipo:'despesa',desc:'Geladeira',valor:3990,cat:'compras',quem:'casal',forma:'credito',parcelas:10,data:addM(cm,-4)+'-12',mesFatura:addM(cm,-4)});
  D.lanc.push({id:id('l'),tipo:'despesa',desc:'Passagens Salvador',valor:2400,cat:'viagens',quem:'p2',forma:'credito',parcelas:6,data:addM(cm,-2)+'-03',mesFatura:addM(cm,-2)});
  D.lanc.push({id:id('l'),tipo:'despesa',desc:'Celular novo',valor:2700,cat:'compras',quem:'p1',forma:'credito',parcelas:12,data:addM(cm,-1)+'-20',mesFatura:addM(cm,-1)});
  for(let k=-5;k<=0;k++){
    const m=addM(cm,k), days=k===0?Math.max(1,dHoje):daysIn(m), f=k===0?days/daysIn(m):1;
    const c=x=>Math.max(0,Math.round(x*f));
    const add=(desc,cat,base,vr,quem,forma,count)=>{for(let i=0;i<count;i++){const d=1+Math.floor(rnd()*days);D.lanc.push({id:id('l'),tipo:'despesa',desc,cat,valor:Math.round((base+rnd()*vr)*100)/100,quem:typeof quem==='function'?quem():quem,forma,parcelas:1,data:m+'-'+pad(d),mesFatura:m});}};
    const pq=()=>pick(['p1','p2','casal']);
    add('Mercado','mercado',250,150,'casal','debito',c(4));
    add('iFood','delivery',48,55,pq,'credito',c(k>=-1?10:6));
    add('Restaurante','delivery',110,90,'casal','credito',c(2));
    add('Uber','transporte',16,24,pq,'credito',c(6));
    add('Combustível','transporte',170,60,'p1','debito',c(2));
    add('Farmácia','saude',35,70,'p2','pix',c(1));
    add('Cinema e passeio','lazer',70,120,'casal','credito',c(2));
    add('Roupas','compras',110,220,'p2','credito',c(1));
    add('Salão','beleza',80,70,'p2','pix',c(1));
    add('Pet shop','pets',130,60,'casal','pix',c(1));
    for(const fo of D.cfg.fontes){ const d=payDate(fo,m,false); if(d>hoje) continue;
      const v=fo.nome==='Salário'?fo.valor+Math.round((rnd()-.4)*25)*10:fo.valor;
      D.receb.push({id:fo.id+'_'+m,fonte:fo.id,quem:fo.quem,nome:fo.nome,mes:m,valor:v,data:d}); }
  }
  for(const t of D.lanc){ if(t.forma!=='credito') continue; t.pagas={}; for(let i=0;i<(t.parcelas||1);i++){const m=addM(t.mesFatura,i); if(m<cm) t.pagas[m]=m+'-10';} }
  D.lanc.push({id:id('l'),tipo:'receita',desc:'Freela de design',valor:1200,cat:'renda',quem:'p2',forma:'pix',data:addM(cm,-1)+'-15'});
  D.metas=[
    {id:'g1',nome:'Sofá novo',tipo:'compra',valor:4500,prazo:addM(cm,4),inicial:900},
    {id:'g2',nome:'Viagem de férias',tipo:'compra',valor:18000,prazo:addM(cm,8),inicial:1500},
    {id:'g3',nome:'Reserva de emergência',tipo:'reserva',valor:36000,prazo:addM(cm,24),inicial:8000}
  ];
  for(let k=-3;k<=-1;k++){const m=addM(cm,k);
    D.aportes.push({id:id('a'),meta:'g1',valor:300,quem:'p1',mes:m});
    D.aportes.push({id:id('a'),meta:'g2',valor:500,quem:'p2',mes:m});
    D.aportes.push({id:id('a'),meta:'g3',valor:400,quem:'casal',mes:m});
  }
  return D;
}

/* ---------- componentes de gráfico ---------- */
const PARTS=[['fixa','Fixas','s1'],['parc','Parcelas','s2'],['var','Dia a dia','s3']];
function segs(o){ return PARTS.filter(([k])=>o[k]>0.004).map(([k,,c])=>`<span style="flex:${o[k].toFixed(2)} 0 0;background:var(--${c})"></span>`).join(''); }
function tipParts(o){ return PARTS.filter(([k])=>o[k]>0.004).map(([k,l])=>`${l} ${fmt0(o[k])}`).join(' · '); }
function partsLegend(extra=''){ return `<div class="legend" style="margin:0 0 12px">${PARTS.map(([,l,c])=>`<span class="li"><span class="sw" style="background:var(--${c})"></span>${l}</span>`).join('')}${extra}</div>`; }
function hbars(rows,lims){
  if(!rows.length) return `<div class="empty">Nenhum gasto neste mês ainda.</div>`;
  const max=Math.max(1,...rows.map(r=>Math.max(r.t,lims?.[r.c]||0)));
  return `<div class="bars">${rows.map(r=>{
    const lim=num(lims?.[r.c]); const over=lim&&r.t>lim;
    const tip=`${r.nome}: ${fmt(r.t)}${lim?` de ${fmt0(lim)} de limite (${pct(r.t/lim)})`:''} — ${tipParts(r)}`;
    return `<div class="brow" data-tip="${esc(tip)}"><div class="blabel">${esc(r.nome)}</div><div class="btrack"><div class="bfill" style="width:${(r.t/max*100).toFixed(2)}%">${segs(r)}</div>${lim?`<div class="blim" style="left:${(lim/max*100).toFixed(2)}%"></div>`:''}</div><div class="bval num ${over?'over':''}">${fmt0(r.t)}</div></div>`;
  }).join('')}</div>`;
}
function colChart(ms,sel,keys){
  const ss=ms.map(summary);
  const val=s=>keys.reduce((a,k)=>a+s[k],0);
  const raw=Math.max(1,...ss.map(s=>Math.max(s.renda,val(s))));
  const step=Math.pow(10,Math.floor(Math.log10(raw))); const max=Math.ceil(raw/step*2)/2*step;
  const grid=[1,.5].map(f=>`<div class="grid" style="bottom:${f*100}%;top:auto"><span>${fmt0(max*f)}</span></div>`).join('');
  return `<div class="cols"><div style="position:absolute;left:0;right:0;top:22px;bottom:24px;pointer-events:none">${grid}</div>${ss.map(s=>{
    const o={}; keys.forEach(k=>o[k]=s[k]); const v=val(s);
    const tip=`${labelLong(s.m)} — renda ${fmt0(s.renda)}, gastos ${fmt0(v)}${v?': '+tipParts(o):''}`;
    const h=v/max*100, rh=s.renda/max*100;
    return `<div class="tcol ${s.m===sel?'sel':''}" data-tip="${esc(tip)}"><div class="tplot"><div class="tstack" style="height:${h.toFixed(2)}%">${PARTS.filter(([k])=>keys.includes(k)&&o[k]>0.004).map(([k,,c])=>`<span style="flex:${o[k].toFixed(2)} 0 0;background:var(--${c})"></span>`).join('')}</div>${s.renda?`<div class="tren" style="bottom:${rh.toFixed(2)}%"></div>`:''}${s.m===sel&&v?`<div class="tval num" style="bottom:calc(${Math.max(h,rh).toFixed(2)}% + 6px)">${fmt0(v)}</div>`:''}</div><div class="tlab">${ms.length>8?MESES[+s.m.slice(5)-1].slice(0,3):labelShort(s.m)}</div></div>`;
  }).join('')}</div>`;
}

const PIE=['s1','s2','s5','s3','s4','s6'];
function donut(rows,center,maxSlices=5){
  rows=rows.filter(r=>r.t>0.004);
  if(!rows.length) return `<div class="empty">Nenhum gasto neste mês ainda.</div>`;
  const total=rows.reduce((a,r)=>a+r.t,0);
  let items=rows.slice(0,maxSlices);
  if(rows.length>maxSlices){ const rest=rows.slice(maxSlices); items.push({nome:`Outras (${rest.length})`,t:rest.reduce((a,r)=>a+r.t,0),sub:rest.map(r=>r.nome).join(', '),other:true}); }
  const R=94,r=56,cx=100,cy=100,gap=items.length>1?0.03:0,SY=.56,TY=6,DEPTH=18; let a0=-Math.PI/2;
  const pt=(rad,a)=>`${(cx+rad*Math.cos(a)).toFixed(2)} ${(cy+rad*Math.sin(a)).toFixed(2)}`;
  const col=(it,i)=>it.other?'#9a8291':`var(--${PIE[i]})`;
  const sl=items.map((it,i)=>{
    const ang=it.t/total*2*Math.PI, a1=a0+ang; let st=a0+gap/2, en=a1-gap/2; if(en<=st){st=a0;en=a1;} a0=a1;
    const tip=`${it.nome}: ${fmt(it.t)} (${pct(it.t/total)})${it.sub?' — '+it.sub:''}`;
    let d;
    if(items.length===1) d=`M${cx-R} ${cy} A${R} ${R} 0 1 1 ${cx+R} ${cy} A${R} ${R} 0 1 1 ${cx-R} ${cy} Z M${cx-r} ${cy} A${r} ${r} 0 1 0 ${cx+r} ${cy} A${r} ${r} 0 1 0 ${cx-r} ${cy} Z`;
    else { const lg=(en-st)>Math.PI?1:0; d=`M${pt(R,st)} A${R} ${R} 0 ${lg} 1 ${pt(R,en)} L${pt(r,en)} A${r} ${r} 0 ${lg} 0 ${pt(r,st)} Z`; }
    return {d,c:col(it,i),tip};
  });
  const layer=(k,top)=>`<g class="${top?'top':'wall'}" transform="translate(0 ${(TY+k).toFixed(1)}) scale(1 ${SY})">${sl.map(p=>`<path d="${p.d}" fill-rule="evenodd" style="fill:${top?p.c:`color-mix(in srgb, ${p.c} ${Math.round(84-k*1.6)}%, #1a0614)`}"${top?` data-tip="${esc(p.tip)}"`:''}/>`).join('')}</g>`;
  let layers=`<ellipse cx="100" cy="${(TY+DEPTH+cy*SY+6).toFixed(1)}" rx="96" ry="${(R*SY*.9).toFixed(1)}" fill="rgba(10,2,12,.35)"/>`; for(let k=DEPTH;k>=1;k--) layers+=layer(k,false);
  const cyT=TY+cy*SY;
  return `<div class="pie pie3d"><svg viewBox="0 0 200 ${Math.ceil(TY+200*SY+DEPTH+4)}" role="img" aria-label="${esc(center.label)}: ${esc(items.map(it=>it.nome+' '+pct(it.t/total)).join(', '))}">${layers}${layer(0,true)}<text class="ct num" x="100" y="${(cyT+2).toFixed(1)}" text-anchor="middle">${esc(fmt0(total))}</text><text class="cs" x="100" y="${(cyT+17).toFixed(1)}" text-anchor="middle">${esc(center.sub)}</text></svg>
    <div class="plist">${items.map((it,i)=>`<div class="pli" data-tip="${esc(`${it.nome}: ${fmt(it.t)}${it.sub?' — '+it.sub:''}`)}"><span class="sw" style="background:${col(it,i)}"></span><span class="n">${esc(it.nome)}<small>${pct(it.t/total)}</small></span><b class="num">${fmt0(it.t)}</b></div>`).join('')}</div></div>`;
}
const chartTog=()=>`<div class="ctog" role="group" aria-label="Tipo de gráfico"><button type="button" class="pill" data-act="chart" data-c="pizza" aria-pressed="${ui.chart==='pizza'}">Pizza</button><button type="button" class="pill" data-act="chart" data-c="barras" aria-pressed="${ui.chart==='barras'}">Barras</button></div>`;

/* ---------- inteligência do mês ---------- */
function meter(label,val,renda,alvo,kind){
  const p=renda?val/renda:0;
  const st = kind==='max' ? (p<=alvo?'good':p<=alvo+.1?'warn':'serious') : (p>=alvo?'good':p>=alvo/2?'warn':'serious');
  const txt = kind==='max' ? (st==='good'?'Dentro da meta':st==='warn'?'Um pouco acima':'Bem acima') : (st==='good'?'Meta batida':st==='warn'?'Abaixo da meta':'Muito abaixo');
  const col={good:'var(--good)',warn:'var(--warn)',serious:'var(--serious)'}[st];
  return `<div><div class="mrow"><span>${label}</span><span class="num">${pct(p)} · ${fmt0(val)}</span></div>
    <div class="mtrack"><div class="mfill" style="width:${Math.min(100,p*100).toFixed(1)}%;background:${col}"></div><div class="mtarget" style="left:${alvo*100}%" title="meta"></div></div>
    <div class="mfoot"><span>${kind==='max'?'Ideal: até':'Ideal: pelo menos'} ${pct(alvo)} da renda (${fmt0(alvo*renda)})</span>${chip(st,txt)}</div></div>`;
}
function insights(s){
  const out=[]; const B=baseline(s.m); const cm=curYM();
  if(!fontes().length) out.push(['warn','Cadastrem os salários e as datas em Ajustes para o app calcular sobra, saldo e metas.']);
  if(s.m===cm){
    const dH=new Date().getDate();
    const venc=s.items.filter(x=>x.k==='fixa'&&!x.f.pagas?.[cm]&&num(x.f.dia)&&num(x.f.dia)<dH);
    if(venc.length) out.push(['crit',`${venc.length===1?'1 conta fixa vencida':venc.length+' contas fixas vencidas'} sem marcar como paga: ${venc.slice(0,3).map(x=>x.f.nome).join(', ')} (${fmt0(venc.reduce((a,x)=>a+x.v,0))}).`]);
    const B0=saldoBase(), pend=s.late.filter(f=>payDate(f,cm)>B0.d);
    if(pend.length) out.push(['warn',`A data de ${pend.map(f=>`${f.nome.toLowerCase()} de ${PESSOAS[f.quem]}`).join(' e ')} já passou e o valor não foi registrado, então não entra no saldo. Se caiu, toquem em “Recebi”.`]);
  } else if(s.m<cm&&s.m>=startMonth()&&s.late.length) out.push(['warn',`Há salário não registrado em ${labelShort(s.m)}; ele não entrou no saldo daquele mês.`]);
  if(s.livre<-0.5&&s.renda>0) out.push(['crit',`Os gastos e o guardado passaram a renda em ${fmt0(-s.livre)} neste mês.`]);
  for(const [c,v] of Object.entries(s.cat)){
    const lim=num(S.cfg.limites?.[c]); if(!lim) continue; const t=v.fixa+v.parc+v.var;
    if(t>lim) out.push(['crit',`${catName(c)} estourou o limite: ${fmt0(t)} de ${fmt0(lim)} (${pct(t/lim)}).`]);
    else if(t>=lim*.8) out.push(['warn',`${catName(c)} já usou ${pct(t/lim)} do limite (${fmt0(t)} de ${fmt0(lim)}).`]);
  }
  if(s.m===cm&&B){
    const frac=new Date().getDate()/daysIn(cm);
    if(frac>=.2&&frac<.97){ const proj=s.var/frac; if(proj>B.var*1.15) out.push(['warn',`No ritmo atual, o dia a dia fecha o mês em cerca de ${fmt0(proj)}, acima da média de ${fmt0(B.var)}.`]); }
  }
  if(B){
    const ups=Object.entries(s.cat).map(([c,v])=>({c,now:v.var,avg:B.cat[c]||0})).filter(x=>x.avg>0&&x.now>x.avg*1.3&&x.now-x.avg>=100).sort((a,b)=>(b.now-b.avg)-(a.now-a.avg));
    for(const x of ups.slice(0,2)) out.push(['warn',`${catName(x.c)} subiu ${pct(x.now/x.avg-1)} em relação à média (+${fmt0(x.now-x.avg)}).`]);
  }
  const nx=summary(addM(s.m,1));
  if(s.renda>0&&nx.parc/s.renda>.25) out.push(['serious',`As parcelas do cartão já comprometem ${pct(nx.parc/s.renda)} da renda de ${labelShort(nx.m)}. Evitem novas compras parceladas.`]);
  const ending=S.lanc.filter(t=>(parseInt(t.parcelas)||1)>1&&t.tipo!=='receita').map(t=>{const n=parseInt(t.parcelas);const st=(t.forma==='credito'&&t.mesFatura)?t.mesFatura:t.data.slice(0,7);return {t,last:addM(st,n-1),v:num(t.valor)/n};}).filter(x=>x.last===s.m);
  for(const x of ending.slice(0,2)) out.push(['good',`Última parcela de “${x.t.desc}” neste mês: libera ${fmt0(x.v)} a partir de ${labelShort(addM(s.m,1))}.`]);
  if(s.m>=cm){
    const need=S.metas.filter(g=>goalRest(g)>0).reduce((a,g)=>a+planGoal(g).porMes,0);
    const sobra=s.renda-s.gastos;
    if(need>0&&s.renda>0){
      if(sobra<need) out.push(['serious',`Para as metas no prazo é preciso guardar ${fmt0(need)}/mês, mas este mês sobram ${fmt0(Math.max(0,sobra))}. Vejam os cortes sugeridos em Metas.`]);
      else out.push(['good',`A sobra de ${fmt0(sobra)} cobre o que as metas pedem (${fmt0(need)}/mês) e ainda deixa ${fmt0(sobra-need)} de folga.`]);
    }
  }
  const ord={crit:0,serious:1,warn:2,good:3,info:4};
  return out.sort((a,b)=>ord[a[0]]-ord[b[0]]).slice(0,6);
}

/* ---------- telas ---------- */
function recebCard(s){
  const fs=fontes(), cm=curYM();
  if(!fs.length) return `<section class="card"><h2>Salários</h2><p class="lead">Cadastrem cada pagamento e a data em que cai (5º dia útil, dia 20…). Todo mês vocês confirmam aqui o valor que caiu.</p><button type="button" class="btn sm" data-act="new-fonte">Cadastrar salários</button></section>`;
  if(month<startMonth()) return '';
  const row=f=>{
    const r=s.rec.find(o=>o.f.id===f.id)?.r, d=payDate(f,month);
    if(r) return `<div class="row" style="cursor:default"><span class="check okbox" aria-hidden="true">✓</span><span class="main"><span class="t">${esc(PESSOAS[f.quem]||'')} · ${esc(f.nome)}</span><span class="s">Caiu em ${dm(r.data)}${Math.abs(num(r.valor)-num(f.valor))>=1?` · previsto ${fmt0(num(f.valor))}`:''}</span></span><button type="button" class="btn sm ghost num" data-act="receb" data-fonte="${esc(f.id)}" aria-label="Editar valor recebido">${fmt(num(r.valor))}</button></div>`;
    const late=s.late.includes(f), antes=late&&d<=saldoBase().d;
    const sub=antes?`caiu ${dm(d)} · já está no saldo`:late?`${dm(d)} · não registrado`:`${esc(whenTxt(f))} · cai ${dm(d)} · previsto ${fmt0(num(f.valor))}`;
    return `<div class="row" style="cursor:default"><span class="check" aria-hidden="true"></span><span class="main"><span class="t">${esc(PESSOAS[f.quem]||'')} · ${esc(f.nome)}</span><span class="s">${sub}</span></span>${late&&!antes?chip('warn','Não registrado'):''}<button type="button" class="btn sm ${antes?'ghost':''}" data-act="receb" data-fonte="${esc(f.id)}">Recebi</button></div>`;
  };
  return `<section class="card"><h2>Salários de ${esc(MESES[+month.slice(5)-1])}</h2><p class="lead">${(()=>{ const nxt=month===cm&&!s.pend.length?fs.map(f=>payDate(f,addM(cm,1))).sort()[0]:''; return `Recebido ${fmt0(s.recebido)}${s.prevPend>0.5?` · ainda vai cair ${fmt0(s.prevPend)}`:''}.${nxt?` Próximo salário: <b>${dm(nxt)}</b>.`:' Confirmem o valor que caiu em cada data.'}`; })()}</p>
    <div class="list">${fs.map(row).join('')}</div>
    ${s.extra?`<div class="sumline" style="margin-top:10px"><span class="muted">Entradas extras no mês</span><b class="num pos">+${fmt(s.extra)}</b></div>`:''}
    <div class="btns"><button type="button" class="btn sm ghost" data-act="new-fonte">+ Adicionar outro salário ou data (ex.: dia 20)</button></div></section>`;
}
function vResumo(){
  const s=summary(month), cm=curYM(), st=startMonth();
  const livre=Math.max(0,s.livre), prev=s.prevPend>0.5;
  const stripSegs=[['Fixas',s.fixa,'s1'],['Parcelas',s.parc,'s2'],['Dia a dia',s.var,'s3'],['Guardado',s.guardado,'s4']];
  const strip = (s.renda||s.gastos) ? `<div class="strip" role="img" aria-label="Divisão da renda do mês">${stripSegs.filter(x=>x[1]>0.004).map(([l,v,c])=>`<span class="seg" style="flex:${v.toFixed(2)} 0 0;background:var(--${c})" data-tip="${esc(`${l}: ${fmt(v)}${s.renda?` (${pct(v/s.renda)} da renda)`:''}`)}"></span>`).join('')}${livre>0.5?`<span class="seg hatch" style="flex:${livre.toFixed(2)} 0 0" data-tip="${esc(`Sobra: ${fmt(livre)} (${pct(livre/(s.renda||1))} da renda)`)}"></span>`:''}</div>
    <div class="legend">${stripSegs.map(([l,v,c])=>`<span class="li"><span class="sw" style="background:var(--${c})"></span>${l} <b class="num">${fmt0(v)}</b></span>`).join('')}<span class="li"><span class="sw hatch" style="border:1px solid var(--line)"></span>Sobra <b class="num">${fmt0(livre)}</b></span></div>
    ${s.livre<-0.5&&!s.late.length?`<div class="over">${chip('crit','Faltou dinheiro')} Gastos e guardado passaram a renda em <b class="num">${fmt0(-s.livre)}</b>.</div>`:''}`
    : `<div class="empty" style="padding:8px 0;text-align:left">Comecem cadastrando os salários e as datas em Ajustes e lançando os gastos com o botão <b>+ Lançar</b>.</div>`;
  const PF=month===cm?previstoFim():null, fin=saldoFinal(month), lp=livreProj(month), futVar=month>cm&&lp<s.livre-0.5;
  const bigVal=PF?PF.hoje:fin, mesNome=MESES[+month.slice(5)-1];
  const eyebrow=PF?`Saldo hoje · ${new Date().getDate()} de ${MESES[new Date().getMonth()]}`:month<cm?`Saldo no fim de ${labelLong(month)}`:`Saldo previsto · fim de ${labelLong(month)}`;
  const saldoBox = PF ? `<a class="saldo" href="#historico"><span>Previsto para o fim do mês<br><span class="muted" style="font-size:12.5px">hoje ${fmt(PF.hoje)}${PF.inn>0.5?` + a receber ${fmt0(PF.inn)}`:''}${PF.out>0.5?` − a pagar ${fmt0(PF.out)}`:''} ›</span></span><b class="num ${PF.fim<0?'neg':''}">${fmt(PF.fim)}</b></a>`
    : month>=st ? `<a class="saldo" href="#historico"><span>Sobra de ${mesNome}<br><span class="muted" style="font-size:12.5px">renda − gastos − guardado ›</span></span><b class="num ${lp<0?'neg':''}">${lp>=0?'+':''}${fmt0(lp)}</b></a>` : '';
  const B=baseline(month);
  const gastoDelta = B&&month<cm ? (s.gastos-(s.fixa+s.parc+B.var)) : null;
  const taxa = s.renda? (s.guardado+Math.max(0,s.livre))/s.renda : 0;
  const tiles=`<div class="tiles">
    <div class="tile" data-tilt><div class="k">Renda</div><div class="v">${fmt0(s.renda)}</div><div class="d">${prev?fmt0(s.rendaReal)+' já recebidos':s.renda?'tudo recebido':'—'}</div></div>
    <div class="tile" data-tilt><div class="k">Gastos</div><div class="v">${fmt0(s.gastos)}</div><div class="d">${gastoDelta===null?(s.renda?pct(s.gastos/s.renda)+' da renda':'—'):(gastoDelta>0?'+':'−')+fmt0(Math.abs(gastoDelta))+' vs. média'}</div></div>
    <div class="tile" data-tilt><div class="k">Poupança</div><div class="v">${pct(taxa)}</div><div class="d">guardado + sobra</div></div></div>`;
  const ins=insights(s);
  let dist='';
  if(month>=cm){
    const sobra=s.renda-s.gastos-s.guardado; let left=Math.max(0,sobra);
    const gs=S.metas.filter(g=>goalRest(g)>0).sort((a,b)=>(a.prazo||'').localeCompare(b.prazo||''));
    if(gs.length&&s.renda>0){
      const rows=gs.map(g=>{const p=planGoal(g);const already=S.aportes.filter(a=>a.meta===g.id&&a.mes===month).reduce((a,b)=>a+num(b.valor),0);const want=Math.max(0,p.porMes-already);const give=Math.min(want,left);left-=give;return {g,want,give,already};});
      dist=`<div class="dist"><h3>Sugestão para a sobra de ${fmt0(Math.max(0,sobra))}</h3>${rows.map(r=>`<div class="drow"><span>${esc(r.g.nome)}<br><span class="muted" style="font-size:12.5px">${r.want<=0.5?'já guardado este mês':r.give+0.5<r.want?`pede ${fmt0(r.want)}, cabe ${fmt0(r.give)}`:`pede ${fmt0(r.want)}`}</span></span>${r.want>0.5?`<button type="button" class="btn sm" data-act="new-aporte" data-meta="${esc(r.g.id)}" data-valor="${Math.round(r.give||r.want)}">Guardar ${fmt0(r.give||r.want)}</button>`:chip('good','Feito')}</div>`).join('')}${left>0.5?`<div class="drow"><span>Fica no saldo acumulado</span><b class="num">${fmt0(left)}</b></div>`:''}</div>`;
    }
  }
  const catRows=Object.entries(s.cat).map(([c,v])=>({c,nome:catName(c),...v,t:v.fixa+v.parc+v.var})).filter(r=>r.t>0.004).sort((a,b)=>b.t-a.t);
  const pRows=['p1','p2','casal'].map(q=>{const v=s.quem[q]||{fixa:0,parc:0,var:0};return {c:q,nome:PESSOAS[q],...v,t:v.fixa+v.parc+v.var};}).filter(r=>r.t>0.004);
  const hasLim=Object.values(S.cfg.limites||{}).some(v=>num(v)>0);
  return `<div class="stack">
    <section class="card hero" data-tilt><div class="eyebrow">${esc(eyebrow)}</div>
      <div class="big ${bigVal<-0.005?'neg':''}" data-count="${bigVal.toFixed(2)}" data-dec="1">${fmt(bigVal)}</div>
      <div class="heroSub">Em ${esc(mesNome)}: renda <b class="num">${fmt0(s.renda)}</b>${prev?` (${fmt0(s.prevPend)} a receber)`:''} · gastos <b class="num">${fmt0(s.gastos)}</b> · guardado <b class="num">${fmt0(s.guardado)}</b></div>
      ${strip}${futVar?`<p class="hint" style="margin:10px 0 0">Mês futuro: já desconta o gasto médio do dia a dia (${fmt0(planBase().var)}), que ainda não foi lançado.</p>`:''}${saldoBox}</section>
    ${recebCard(s)}
    ${tiles}
    <section class="card"><h2>Plano do mês</h2><p class="lead">Regra 50/30/20: metade da renda para o essencial, até 30% para estilo de vida e pelo menos 20% guardado.</p>
      <div class="meters">${meter('Essenciais',s.ess,s.renda,.5,'max')}${meter('Estilo de vida',s.est,s.renda,.3,'max')}${meter('Guardado',s.guardado,s.renda,.2,'min')}</div>
      ${ins.length?`<ul class="insights">${ins.map(([st,t])=>`<li>${chip(st,{crit:'Atenção',serious:'Cuidado',warn:'Alerta',good:'Bom',info:'Info'}[st])}<span>${esc(t)}</span></li>`).join('')}</ul>`:''}
      ${dist}
    </section>
    <div class="grid2">
      <section class="card"><div class="chead"><h2>Onde o dinheiro foi</h2>${chartTog()}</div>${ui.chart==='pizza'
        ? `<p class="lead">Parte de cada categoria no total gasto. As 6 maiores aparecem separadas; toque numa fatia para ver o valor.</p>${donut(catRows,{label:'Gastos por categoria',sub:'gastos no mês'},6)}`
        : `<p class="lead">Gastos por categoria${hasLim?'; a linha preta é o limite que vocês definiram':''}.</p>${partsLegend(hasLim?'<span class="li"><span class="sw lim"></span>Limite</span>':'')}${hbars(catRows,S.cfg.limites)}`}</section>
      <section class="card"><div class="chead"><h2>Quem gastou</h2>${chartTog()}</div><p class="lead">“Casal” são as contas divididas.</p>${ui.chart==='pizza'
        ? donut(pRows,{label:'Gastos por pessoa',sub:'gastos no mês'})
        : partsLegend()+hbars(pRows)}</section>
    </div>
    <section class="card"><h2>Últimos 6 meses</h2><p class="lead">Gastos empilhados; a linha mostra a renda de cada mês.</p>${partsLegend('<span class="li"><span class="sw ren"></span>Renda</span>')}${colChart([...Array(6)].map((_,i)=>addM(month,i-5)),month,['fixa','parc','var'])}</section>
  </div>`;
}
function vLanc(){
  const it=monthItems(month).filter(x=>x.k!=='fixa');
  const f=it.filter(x=>(ui.quem==='todos'||x.quem===ui.quem)&&(!ui.busca||(x.t.desc+' '+catName(x.cat)).toLowerCase().includes(ui.busca.toLowerCase())));
  const parc=f.filter(x=>x.k==='parc'), rest=f.filter(x=>x.k!=='parc').sort((a,b)=>b.t.data.localeCompare(a.t.data));
  const desp=f.filter(x=>x.k!=='rec').reduce((a,b)=>a+b.v,0), rec=f.filter(x=>x.k==='rec').reduce((a,b)=>a+b.v,0);
  const s=summary(month);
  const row=x=>{
    const t=x.t; const sub=[catName(x.cat),PESSOAS[x.quem]||'Casal',FORMAS[t.forma]||''].filter(Boolean).join(' · ');
    return `<button type="button" class="row" data-act="edit-lanc" data-id="${esc(t.id)}"><span class="dot" style="background:${x.k==='rec'?'var(--good)':x.k==='parc'?'var(--s2)':'var(--s3)'}"></span><span class="main"><span class="t">${esc(t.desc)}${x.k==='parc'?`<span class="tag">${x.i+1}/${x.n}</span>`:''}</span><span class="s">${esc(sub)}</span></span><span class="v num ${x.k==='rec'?'in':''}">${x.k==='rec'?'+':''}${fmt(x.v)}</span></button>`;
  };
  const groups={}; for(const x of rest){(groups[x.t.data]||(groups[x.t.data]=[])).push(x);}
  const dayLabel=d=>{const [y,m,dd]=d.split('-').map(Number);return new Date(y,m-1,dd).toLocaleDateString('pt-BR',{weekday:'short',day:'numeric',month:'short'});};
  return `<div class="stack">
    <div class="filters">${['todos','p1','p2','casal'].map(q=>`<button type="button" class="pill" data-act="quem" data-q="${q}" aria-pressed="${ui.quem===q}">${q==='todos'?'Todos':PESSOAS[q]}</button>`).join('')}<input class="search" id="busca" type="search" placeholder="Buscar" value="${esc(ui.busca)}" aria-label="Buscar lançamentos"></div>
    <div class="sumline"><span class="muted">${f.length} lançamento${f.length===1?'':'s'}</span><span>Saídas <b class="num">${fmt(desp)}</b>${rec?` · entradas <b class="num" style="color:var(--good-ink)">${fmt(rec)}</b>`:''}</span></div>
    ${parc.length?`<div><div class="dayh">Parcelas que caem em ${esc(labelLong(month))}</div><div class="list">${parc.map(row).join('')}</div></div>`:''}
    ${Object.keys(groups).length?Object.entries(groups).map(([d,xs])=>`<div><div class="dayh">${esc(dayLabel(d))}</div><div class="list">${xs.map(row).join('')}</div></div>`).join(''):(!parc.length?`<div class="list"><div class="empty">Nada lançado ${ui.busca||ui.quem!=='todos'?'com esse filtro':'neste mês'}. Use <b>+ Lançar</b> para registrar um gasto ou uma entrada.</div></div>`:'')}
    <a href="#contas" class="card" style="text-decoration:none;color:inherit;display:flex;justify-content:space-between;gap:10px"><span>Contas fixas do mês</span><b class="num">${fmt(s.fixa)} ›</b></a>
  </div>`;
}
function payBtn(kind,id,paid,label){return `<button type="button" class="check" data-act="pay" data-kind="${kind}" data-id="${esc(id)}" aria-pressed="${paid}" aria-label="${paid?'Desmarcar pagamento':'Marcar como pago'}: ${esc(label)}">${paid?'✓':''}</button>`;}
const paidTxt=p=>typeof p==='string'&&p?'paga em '+dm(p):'paga';
const mainBtn=(act,id,t,sub)=>`<button type="button" class="main" data-act="${act}" data-id="${esc(id)}" style="background:none;border:0;text-align:left;padding:0;cursor:pointer;min-width:0"><span class="t" style="display:block">${t}</span><span class="s" style="display:block">${esc(sub)}</span></button>`;
function vContas(){
  const m=month, cm=curYM();
  const fx=S.fixas.filter(f=>f.ativo!==false&&(!f.inicio||f.inicio<=m)&&(!f.fim||f.fim>=m)).sort((a,b)=>num(a.dia)-num(b.dia));
  const inactive=S.fixas.filter(f=>!fx.includes(f));
  const tot=fx.reduce((a,f)=>a+num(f.valor),0), pagas=fx.filter(f=>f.pagas?.[m]);
  const card=monthItems(m).filter(x=>x.t&&x.k!=='rec'&&x.t.forma==='credito').sort((a,b)=>(b.k==='parc')-(a.k==='parc')||b.v-a.v);
  const fat=card.reduce((a,x)=>a+x.v,0), fatPend=card.filter(x=>!x.t.pagas?.[m]);
  const dH=new Date().getDate();
  const fixRow=f=>{
    const p=f.pagas?.[m], paid=!!p, late=!paid&&((m===cm&&num(f.dia)&&num(f.dia)<dH)||m<cm);
    const sub=[f.dia?'vence dia '+f.dia:null, paid?paidTxt(p):catName(f.cat), PESSOAS[f.quem]||'Casal'].filter(Boolean).join(' · ');
    return `<div class="row" style="cursor:default">${payBtn('fixa',f.id,paid,f.nome)}${mainBtn('edit-fixa',f.id,esc(f.nome),sub)}${late?chip('crit','Vencida'):''}<span class="v num">${fmt(num(f.valor))}</span></div>`;
  };
  const cardRow=x=>{
    const t=x.t, p=t.pagas?.[m], paid=!!p, st=(t.mesFatura||t.data.slice(0,7)), falta=x.k==='parc'?(x.n-x.i-1)*x.v:0;
    const sub=[x.k==='parc'?`parcela ${x.i+1} de ${x.n}`:'à vista', paid?paidTxt(p):(x.k==='parc'?(falta>0.5?`depois faltam ${fmt0(falta)} até ${labelShort(addM(st,x.n-1))}`:'última parcela'):null), PESSOAS[t.quem]||'Casal'].filter(Boolean).join(' · ');
    return `<div class="row" style="cursor:default">${payBtn('lanc',t.id,paid,t.desc)}${mainBtn('edit-lanc',t.id,esc(t.desc)+(x.k==='parc'?`<span class="tag">${x.i+1}/${x.n}</span>`:''),sub)}<span class="v num">${fmt(x.v)}</span></div>`;
  };
  return `<div class="stack">
    <section class="card"><div class="ghead"><div><h2>Contas fixas</h2><p class="lead">${fx.length} contas · ${pagas.length} pagas em ${esc(labelShort(m))}. Toquem no quadrado quando pagarem; a data fica registrada no Histórico.</p></div><button type="button" class="btn sm" data-act="new-fixa">Nova</button></div>
      <div class="list">${fx.length?fx.map(fixRow).join(''):`<div class="empty">Cadastrem aluguel, condomínio, luz, internet, plano de saúde… Elas entram em todo mês automaticamente.</div>`}</div>
      <div class="sumline" style="margin-top:10px"><span class="muted">Total fixo por mês</span><b class="num">${fmt(tot)}</b></div>
      ${inactive.length?`<details style="margin-top:10px"><summary class="muted" style="cursor:pointer;font-size:13.5px">${inactive.length} fora deste mês (encerradas ou futuras)</summary><div class="list" style="margin-top:8px">${inactive.map(f=>`<button type="button" class="row" data-act="edit-fixa" data-id="${esc(f.id)}"><span class="main"><span class="t">${esc(f.nome)}</span><span class="s">${f.ativo===false?'Pausada':f.fim&&f.fim<m?'Encerrou em '+esc(labelShort(f.fim)):'Começa em '+esc(labelShort(f.inicio||m))}</span></span><span class="v num">${fmt(num(f.valor))}</span></button>`).join('')}</div></details>`:''}
    </section>
    <section class="card"><div class="ghead"><div><h2>Fatura do cartão · ${esc(labelShort(m))}</h2><p class="lead">Parcelas e compras à vista no crédito que caem nesta fatura. Para lançar uma nova, use <b>+ Lançar</b>.</p></div></div>
      <div class="list">${card.length?card.map(cardRow).join(''):`<div class="empty">Nada no cartão neste mês.</div>`}</div>
      <div class="sumline" style="margin-top:10px"><span class="muted">Total da fatura</span><b class="num">${fmt(fat)}</b></div>
      ${card.length?(fatPend.length?`<div class="btns"><button type="button" class="btn" data-act="pay-fatura">Marcar fatura inteira como paga</button></div>`:`<div style="margin-top:10px">${chip('good','Fatura paga')}</div>`):''}
    </section>
    <section class="card"><h2>Já comprometido nos próximos 12 meses</h2><p class="lead">Fixas e parcelas que vão cair, antes de qualquer gasto do dia a dia. Quando a coluna baixa, uma parcela acabou.</p>
      <div class="legend" style="margin:0 0 12px"><span class="li"><span class="sw" style="background:var(--s1)"></span>Fixas</span><span class="li"><span class="sw" style="background:var(--s2)"></span>Parcelas</span><span class="li"><span class="sw ren"></span>Renda prevista</span></div>
      ${colChart([...Array(12)].map((_,i)=>addM(cm,i)),cm,['fixa','parc'])}</section>
  </div>`;
}
function vHist(){
  const cm=curYM(), st=startMonth(), last=month>cm?month:cm;
  const ms=[]; for(let p=last;p>=st&&ms.length<24;p=addM(p,-1)) ms.push(p);
  const s=summary(month);
  const all=s.items.filter(x=>x.k!=='rec').map(x=>({x,p:itemPaid(x,month)}));
  const paid=all.filter(o=>o.p!==null).sort((a,b)=>(a.p||'').localeCompare(b.p||''));
  const ord=x=>x.k==='fixa'?0:x.k==='parc'?1:2;
  const pend=all.filter(o=>o.p===null).sort((a,b)=>ord(a.x)-ord(b.x)||num(a.x.f?.dia)-num(b.x.f?.dia)||(a.x.t?.data||'').localeCompare(b.x.t?.data||''));
  const tot=a=>a.reduce((v,o)=>v+o.x.v,0);
  const prow=(o,pending)=>{
    const x=o.x, isF=x.k==='fixa', id=isF?x.f.id:x.t.id, title=isF?x.f.nome:x.t.desc, toggle=isF||x.t.forma==='credito';
    const sub=[x.k==='parc'?`parcela ${x.i+1} de ${x.n}`:null, pending?(isF&&x.f.dia?'vence dia '+x.f.dia:'a pagar'):(o.p?'pago em '+dm(o.p):'pago'), isF?'conta fixa':(FORMAS[x.t.forma]||''), PESSOAS[x.quem]||'Casal'].filter(Boolean).join(' · ');
    const box = toggle ? payBtn(isF?'fixa':'lanc',id,!pending,title) : `<span class="check okbox" aria-hidden="true">✓</span>`;
    return `<div class="row" style="cursor:default">${box}<span class="main"><span class="t">${esc(title)}${x.k==='parc'?`<span class="tag">${x.i+1}/${x.n}</span>`:''}</span><span class="s">${esc(sub)}</span></span><span class="v num">${fmt(x.v)}</span></div>`;
  };
  const recRows=[...s.rec.map(({f,r})=>({t:`${PESSOAS[f.quem]||''} · ${f.nome}`,d:r.data,v:num(r.valor)})),...s.items.filter(x=>x.k==='rec').map(x=>({t:x.t.desc+' (extra)',d:x.t.data,v:x.v}))].sort((a,b)=>(a.d||'').localeCompare(b.d||''));
  const hrow=p=>{const q={...summary(p),livre:livreProj(p)}, fin=saldoFinal(p), pv=q.prevPend>0.5||p>cm;
    return `<button type="button" class="hrow ${p===month?'sel':''}" data-act="go-month" data-m="${p}" aria-pressed="${p===month}"><div class="h1"><span style="font-weight:700;text-transform:capitalize">${esc(labelLong(p))}${p===cm?'<span class="tag">atual</span>':''}${pv?'<span class="tag">previsto</span>':''}</span><b class="num ${fin<0?'neg':''}">${fmt0(fin)}</b></div>
      <div class="h2"><span>Renda<b class="num">${fmt0(q.renda)}</b></span><span>Gastos<b class="num">${fmt0(q.gastos)}</b></span><span>Guardado<b class="num">${fmt0(q.guardado)}</b></span><span>Sobra<b class="num ${q.livre<-0.5?'neg':'pos'}">${q.livre>=0?'+':''}${fmt0(q.livre)}</b></span></div></button>`;};
  return `<div class="stack">
    <section class="card"><h2>Mês a mês</h2><p class="lead">O número grande é o saldo acumulado no fim de cada mês: o que sobra num mês soma no seguinte${num(S.cfg.saldoInicial)?` (começou com ${fmt0(num(S.cfg.saldoInicial))} em ${esc(labelShort(st))})`:''}. Toquem num mês para ver os pagamentos dele.</p>
      <div class="list">${ms.map(hrow).join('')}</div></section>
    <section class="card" id="pagamentos"><h2>Pagamentos de ${esc(labelLong(month))}</h2><p class="lead">Registro de tudo o que foi pago, com o número de cada parcela. Pix, débito e dinheiro contam como pagos na data do lançamento; contas fixas e cartão vocês marcam no quadrado.</p>
      <div class="sumline" style="margin:0 2px 4px"><span>Pago <b class="num pos">${fmt(tot(paid))}</b></span><span>A pagar <b class="num ${tot(pend)>0.5?'neg':''}">${fmt(tot(pend))}</b></span></div>
      ${pend.length?`<div class="dayh">A pagar (${pend.length})</div><div class="list">${pend.map(o=>prow(o,true)).join('')}</div>`:''}
      <div class="dayh">Pagos (${paid.length})</div><div class="list">${paid.length?paid.map(o=>prow(o,false)).join(''):'<div class="empty">Nenhum pagamento registrado neste mês.</div>'}</div></section>
    <section class="card"><h2>Recebimentos de ${esc(labelLong(month))}</h2>
      <div class="list">${recRows.length?recRows.map(r=>`<div class="row" style="cursor:default"><span class="main"><span class="t">${esc(r.t)}</span><span class="s">${r.d?'caiu em '+dm(r.d):''}</span></span><span class="v num in">+${fmt(r.v)}</span></div>`).join(''):'<div class="empty">Nenhum recebimento registrado.</div>'}</div>
      ${s.prevPend>0.5?`<p class="hint" style="margin:8px 0 0">Ainda a registrar: ${fmt(s.prevPend)} (${esc(s.pend.map(f=>`${PESSOAS[f.quem]} · ${f.nome}`).join(', '))}).</p>`:''}</section>
  </div>`;
}
function vMetas(){
  const cm=curYM(); const sal=salTotal();
  const gs=[...S.metas].sort((a,b)=>(goalRest(a)>0?0:1)-(goalRest(b)>0?0:1)||(a.prazo||'').localeCompare(b.prazo||''));
  const active=gs.filter(g=>goalRest(g)>0);
  const need=active.reduce((a,g)=>a+planGoal(g).porMes,0);
  let cap=0; for(let i=0;i<6;i++) cap+=capMonth(addM(cm,i)); cap/=6;
  const B=planBase();
  const head = active.length&&sal ? `<section class="card"><h2>Todas as metas juntas</h2><p class="lead">Quanto precisam guardar por mês para cumprir todos os prazos, comparado com o que costuma sobrar.</p>
    <div class="kv"><div>Guardar por mês</div><div class="num">${fmt0(need)}</div><div>Sobra média estimada</div><div class="num">${fmt0(cap)}</div></div>
    <p class="muted" style="font-size:13px;margin:8px 0 0">Gasto do dia a dia considerado: ${fmt0(B.var)}/mês ${B.estimado?'(estimado pelo mês atual)':`(média dos últimos ${B.n} ${B.n===1?'mês':'meses'})`}.</p>
    <div style="margin-top:10px">${need<=cap?chip('good',`Cabe: sobram ${fmt0(cap-need)}/mês de folga`):chip('serious',`Faltam ${fmt0(need-cap)}/mês para tudo caber`)}</div></section>` : '';
  const card=g=>{
    const p=planGoal(g); const [st,stt]=GOAL_ST[p.status];
    const pr=Math.min(1,p.saved/(num(g.valor)||1));
    let plan='';
    if(p.done) plan=`<p class="rec">Vocês juntaram ${fmt0(p.saved)}. Hora de comprar! Depois, marquem como concluída ou editem para um novo valor.</p>`;
    else if(!sal) plan=`<p>Cadastrem os salários em Ajustes para o app calcular quanto guardar e onde cortar.</p>`;
    else {
      plan=`<p class="rec">Guardem <b class="num">${fmt0(p.porMes)}/mês</b> por ${p.meses} ${p.meses===1?'mês':'meses'} (≈ ${fmt0(p.porMes/4.33)} por semana)${p.late?' — o prazo já passou, então o cálculo considera este mês':''}.</p>`;
      if(p.split) plan+=`<p class="muted">Proporcional aos salários: ${esc(P1())} ${fmt0(p.split.p1)} · ${esc(P2())} ${fmt0(p.split.p2)}.</p>`;
      if(p.status==='ok') plan+=`<p>Cabe no orçamento: depois das outras metas, sobram em média ${fmt0(p.avgDisp-p.porMes)}/mês.</p>`;
      if(p.status==='apertado') plan+=`<p>Cabe, mas usa ${pct(p.porMes/p.avgDisp)} do que sobra depois das outras metas. Qualquer imprevisto atrasa.</p>`;
      if(p.status==='cortes') plan+=`<p>Com o ritmo atual faltam <b class="num">${fmt0(p.gapMes)}/mês</b>. Estes cortes fecham a conta:</p>`;
      if(p.status==='inviavel') plan+=`<p>Com o ritmo atual faltam <b class="num">${fmt0(p.gapMes)}/mês</b>. Mesmo cortando tudo abaixo ainda faltariam ${fmt0(p.faltaMes)}/mês.</p>`;
      if(p.cuts.length){
        const title = p.status==='ok'||p.status==='apertado' ? (p.antes?`Para chegar antes (em ${labelShort(p.antes)})`:'Onde dá para economizar') : 'Cortes sugeridos por mês';
        plan+=`<div class="cuts"><div class="ch">${esc(title)}</div>${p.cuts.map(c=>`<div class="cut"><span>${esc(catName(c.c))}</span><span class="arrow num">${fmt0(c.atual)} → <b>${fmt0(c.novo)}</b> (−${fmt0(c.corte)})</span></div>`).join('')}</div>`;
        if(p.status==='cortes'||p.status==='inviavel') plan+=`<p class="muted" style="font-size:13px">Dica: definam esses valores como limite em Ajustes; o Resumo avisa quando chegar perto.</p>`;
      }
      if(p.status==='inviavel') plan+=`<p><b>Alternativas:</b> ${p.novaData?`adiar para <b>${esc(labelLong(p.novaData))}</b> (com os cortes)`:'rever o valor da meta'}${p.faltaMes>0?`, ou aumentar a renda em ${fmt0(p.faltaMes)}/mês`:''}.</p>`;
    }
    const aps=S.aportes.filter(a=>a.meta===g.id).sort((a,b)=>(b.mes||'').localeCompare(a.mes||''));
    return `<article class="card goal" data-tilt><div class="ghead"><div><h3>${esc(g.nome)}</h3><div class="muted" style="font-size:13px">${g.tipo==='reserva'?'Reserva':'Compra'} · até ${esc(labelLong(g.prazo||addM(cm,12)))}</div></div>${chip(st,stt)}</div>
      <div class="gnums"><b class="num">${fmt0(p.saved)}</b> de ${fmt0(num(g.valor))} · ${pct(pr)}${p.rest>0?` · faltam ${fmt0(p.rest)}`:''}</div>
      <div class="prog" role="img" aria-label="${pct(pr)} guardado"><span style="width:${Math.max(pr>0?3:0,pr*100).toFixed(1)}%"></span></div>
      <div class="gplan">${plan}</div>
      ${aps.length?`<details style="margin-top:8px"><summary class="muted" style="cursor:pointer;font-size:13px">${aps.length} depósito${aps.length===1?'':'s'} registrados</summary><div style="margin-top:6px">${aps.slice(0,12).map(a=>`<div class="drow"><span>${esc(labelShort(a.mes||cm))} · ${esc(PESSOAS[a.quem]||'Casal')}</span><span style="display:flex;gap:10px;align-items:center"><b class="num">${fmt(num(a.valor))}</b><button type="button" class="btn sm danger" data-act="del-aporte" data-id="${esc(a.id)}" aria-label="Apagar depósito">Apagar</button></span></div>`).join('')}</div></details>`:''}
      <div class="btns">${p.done?'':`<button type="button" class="btn" data-act="new-aporte" data-meta="${esc(g.id)}" data-valor="${Math.round(p.porMes||0)}">Guardar dinheiro</button>`}<button type="button" class="btn ghost" data-act="edit-meta" data-id="${esc(g.id)}">Editar</button></div>
      </article>`;
  };
  return `<div class="stack">${head}
    ${gs.length?gs.map(card).join(''):`<section class="card"><h2>Nenhuma meta ainda</h2><p class="lead">Cadastrem algo que querem comprar (com valor e data) ou uma reserva de emergência. O app calcula quanto guardar por mês e onde cortar.</p></section>`}
    <button type="button" class="btn" data-act="new-meta" style="justify-self:start">Nova meta</button></div>`;
}
function vAjustes(){
  const fs=fontes(), cm=curYM(), lims=Object.entries(S.cfg.limites||{}).filter(([,v])=>num(v)>0), sab=S.cfg.sabadoUtil===true;
  const modeTxt = mode==='demo'?'Vocês estão vendo dados de exemplo. Nada é salvo.':mode==='db'?'Salvo no banco de dados online e sincronizado ao vivo entre os aparelhos.':'Salvo só neste navegador.';
  return `<div class="stack">
    <section class="card"><div class="ghead"><div><h2>Nomes</h2><p class="lead">Como cada um aparece no app.</p></div><button type="button" class="btn sm" data-act="edit-nomes">Editar</button></div>
      <div class="kv"><div>Pessoa 1</div><div>${esc(P1())}</div><div>Pessoa 2</div><div>${esc(P2())}</div></div></section>
    <section class="card"><div class="ghead"><div><h2>Salários e datas</h2><p class="lead">Cada pagamento que cai todo mês e quando. No Resumo vocês confirmam o valor que realmente caiu.</p></div><button type="button" class="btn sm" data-act="new-fonte">Novo</button></div>
      <div class="list">${fs.length?fs.map(f=>`<button type="button" class="row" data-act="edit-fonte" data-id="${esc(f.id)}"><span class="main"><span class="t">${esc(PESSOAS[f.quem]||'')} · ${esc(f.nome)}</span><span class="s">${esc(whenTxt(f))} · em ${esc(labelShort(cm))} cai ${dm(payDate(f,cm))}</span></span><span class="v num">${fmt(num(f.valor))}</span></button>`).join(''):`<div class="empty">Ex.: ${esc(P1())} no 5º dia útil e no dia 20; ${esc(P2())} no 5º dia útil.</div>`}</div>
      <div class="sumline" style="margin-top:10px"><span class="muted">Previsto por mês</span><b class="num">${fmt(salTotal())}</b></div>
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:center;margin-top:14px;font-size:14px"><span>Sábado conta como dia útil<br><span class="muted" style="font-size:12.5px">Deixe em “Não” se a empresa paga contando só de segunda a sexta. Domingos e feriados nacionais nunca contam.</span></span><button type="button" class="pill" data-act="toggle-sab" aria-pressed="${sab}">${sab?'Sim':'Não'}</button></div>
      <p class="hint" style="margin:10px 0 0">Pagamento em dia fixo que cai em fim de semana ou feriado aparece no dia útil anterior.</p></section>
    <section class="card"><div class="ghead"><div><h2>Saldo acumulado</h2><p class="lead">Parte do saldo que vocês informaram e soma tudo o que entra e sai depois dele.</p></div><button type="button" class="btn sm" data-act="edit-saldo">Editar</button></div>
      <div class="kv"><div>Saldo informado${S.cfg.saldoData?` em ${dm(S.cfg.saldoData)}`:''}</div><div class="num">${fmt(num(S.cfg.saldoInicial))}</div><div>Saldo hoje</div><div class="num">${fmt(ledger(today()))}</div><div>Previsto no fim de ${esc(labelShort(cm))}</div><div class="num">${fmt(previstoFim().fim)}</div></div></section>
    <section class="card"><div class="ghead"><div><h2>Limites por categoria</h2><p class="lead">Teto mensal de gasto. O Resumo avisa aos 80% e quando estoura.</p></div><button type="button" class="btn sm" data-act="edit-lim">Editar</button></div>
      ${lims.length?`<div class="kv">${lims.map(([c,v])=>`<div>${esc(catName(c))}</div><div class="num">${fmt0(num(v))}</div>`).join('')}</div>`:`<p class="muted" style="margin:0">Nenhum limite ainda. Em “Editar” há um botão que sugere limites pelo histórico de vocês.</p>`}</section>
    <section class="card"><h2>Categorias</h2><p class="lead">Como cada categoria conta na regra 50/30/20.</p>
      <p style="margin:0 0 6px"><b>Essenciais:</b> <span class="muted">${CATS.filter(c=>c[2]==='ess').map(c=>c[1]).join(', ')}</span></p>
      <p style="margin:0"><b>Estilo de vida:</b> <span class="muted">${CATS.filter(c=>c[2]==='est').map(c=>c[1]).join(', ')}</span></p></section>
    ${mode==='db'||(mode==='demo'&&baseMode==='db')?`<section class="card"><div class="ghead"><div><h2>Conta</h2><p class="lead">Conectado como <b>${esc(session?.user?.email||'')}</b>. Cada um entra com o próprio e-mail e senha; os dados são os mesmos para os dois e atualizam ao vivo.</p></div></div><div class="btns" style="margin-top:0"><button type="button" class="btn ghost" data-act="logout">Sair</button></div></section>`:''}
    <section class="card"><h2>Dados</h2><p class="lead">${esc(modeTxt)}</p>
      <div class="btns" style="margin-top:0">${mode==='demo'?`<button type="button" class="btn" data-act="exit-demo">Começar com nossos dados</button>`:`<button type="button" class="btn ghost" data-act="demo">Ver com dados de exemplo</button>`}<button type="button" class="btn ghost" data-act="download">Baixar backup</button><button type="button" class="btn ghost" data-act="backup">Copiar backup</button><button type="button" class="btn ghost" data-act="import">Importar backup</button></div></section>
  </div>`;
}
const VIEWS={resumo:vResumo,lancamentos:vLanc,contas:vContas,historico:vHist,metas:vMetas,ajustes:vAjustes};

function bannerHTML(){
  if(mode==='demo') return `<div class="banner"><span class="grow"><b>Modo exemplo.</b> Estes números são fictícios para vocês verem como funciona. Nada do que mudarem aqui é salvo.</span><button type="button" class="btn sm" data-act="exit-demo">Começar com nossos dados</button></div>`;
  if(!canWrite) return `<div class="banner"><span class="grow">Você está só visualizando. Para lançar, peça acesso de <b>Editor</b> a quem compartilhou a página.</span></div>`;
  if(loadNote) return `<div class="banner"><span class="grow">${esc(loadNote)}</span></div>`;
  return '';
}
const TITLES={resumo:'Resumo',lancamentos:'Lançamentos',contas:'Contas e cartão',historico:'Histórico',metas:'Metas',ajustes:'Ajustes'};
const REDUCE=matchMedia('(prefers-reduced-motion: reduce)');
let lastKey='', enterT=null;
function countUp(root){
  if(REDUCE.matches) return;
  root.querySelectorAll('[data-count]').forEach(el=>{
    const to=+el.dataset.count; if(!isFinite(to)||Math.abs(to)<1) return;
    const t0=performance.now(), dur=900;
    const step=t=>{ const k=Math.min(1,(t-t0)/dur), e=1-Math.pow(1-k,3); el.textContent=(el.dataset.dec?fmt:fmt0)(to*e); if(k<1&&el.isConnected) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}
function render(){
  memo.clear(); syncNames();
  $('#mlabel').textContent=labelLong(month);
  $('#mnav').style.visibility=(view==='metas'||view==='ajustes')?'hidden':'visible';
  $('#ttl').textContent=TITLES[view]||'';
  if(mode!=='loading'){ const cm=curYM(); $('#sfoot').innerHTML=`Saldo hoje<b class="num">${fmt(ledger(today()))}</b>`; }
  document.querySelectorAll('[data-v]').forEach(a=>a.setAttribute('aria-current',a.dataset.v===view?'page':'false'));
  $('#banner').innerHTML=bannerHTML();
  $('#fab').hidden=!canWrite&&mode!=='demo';
  const v=$('#view');
  if(mode==='loading'){ v.innerHTML=`<div class="stack"><div class="skel"></div><div class="skel" style="height:80px"></div><div class="skel"></div></div>`; return; }
  const ae=document.activeElement, aid=ae&&ae.id&&v.contains(ae)?ae.id:null, sel=aid&&ae.selectionStart!=null?[ae.selectionStart,ae.selectionEnd]:null;
  v.innerHTML=VIEWS[view]();
  const key=view+'|'+month;
  if(key!==lastKey){ lastKey=key; v.classList.remove('enter'); void v.offsetWidth; v.classList.add('enter'); clearTimeout(enterT); enterT=setTimeout(()=>v.classList.remove('enter'),1600); countUp(v); }
  if(aid){ const el=document.getElementById(aid); if(el){ el.focus(); if(sel) try{el.setSelectionRange(...sel);}catch(e){} } }
}

/* ---------- formulários ---------- */
let sheetSubmit=null;
function openSheet(title,body,onSubmit,extraActs=''){
  sheetSubmit=onSubmit;
  $('#panel').innerHTML=`<h2 id="sheetTitle">${esc(title)}</h2><form class="f" id="sheetForm" novalidate>${body}<div class="acts">${extraActs}<div class="r"><button type="button" class="btn ghost" data-act="close">Cancelar</button><button type="submit" class="btn">Salvar</button></div></div></form>`;
  $('#sheet').hidden=false;
  setTimeout(()=>{const f=$('#panel').querySelector('input:not([type=radio]),select');f&&f.focus();},40);
}
function closeSheet(){ $('#sheet').hidden=true; $('#panel').innerHTML=''; sheetSubmit=null; }
const opts=(obj,sel)=>Object.entries(obj).map(([k,v])=>`<option value="${esc(k)}" ${k===sel?'selected':''}>${esc(v)}</option>`).join('');
const catOpts=sel=>`<optgroup label="Essenciais">${CATS.filter(c=>c[2]==='ess').map(c=>`<option value="${c[0]}" ${c[0]===sel?'selected':''}>${c[1]}</option>`).join('')}</optgroup><optgroup label="Estilo de vida">${CATS.filter(c=>c[2]==='est').map(c=>`<option value="${c[0]}" ${c[0]===sel?'selected':''}>${c[1]}</option>`).join('')}</optgroup>`;
const money=v=>v||v===0?brl2.format(v):'';

function lancForm(t){
  const isNew=!t; t=t||{tipo:'despesa',forma:'pix',quem:'casal',cat:'',parcelas:1,data:month===curYM()?today():month+'-01'};
  const n=parseInt(t.parcelas)||1, freq0=n>1?'parc':'unica', d0=t.data||today(), fat0=esc(t.mesFatura||d0.slice(0,7));
  const body=`
    <div class="seg2" role="radiogroup" aria-label="Tipo"><label><input type="radio" name="tipo" value="despesa" ${t.tipo!=='receita'?'checked':''}>Gasto</label><label><input type="radio" name="tipo" value="receita" ${t.tipo==='receita'?'checked':''}>Entrada extra</label></div>
    <label>Descrição<input id="f-desc" name="desc" value="${esc(t.desc||'')}" placeholder="Ex.: Mercado, iFood, Academia" autocomplete="off"></label>
    <div class="hint" id="f-guess"></div>
    <div class="two"><label>Valor (R$)<input id="f-valor" name="valor" inputmode="decimal" value="${money(n>1&&!isNew?num(t.valor)/n:t.valor)}" placeholder="0,00"></label><label>Data<input id="f-data" name="data" type="date" value="${esc(d0)}"></label></div>
    <div class="two" data-only="despesa"><label>Categoria<select id="f-cat" name="cat">${catOpts(t.cat||'outros')}</select></label><label>Quem<select id="f-quem" name="quem">${opts(PESSOAS,t.quem||'casal')}</select></label></div>
    <div data-only="receita" hidden><label>De quem<select id="f-quemr" name="quemr">${opts(PESSOAS,t.quem||'casal')}</select></label></div>
    <div class="two" data-only="despesa"><label>Forma de pagamento<select id="f-forma" name="forma">${opts(FORMAS,t.forma||'pix')}</select></label><label>Como se repete<select id="f-freq" name="freq">${opts({unica:'Só esta vez',parc:'Parcelado',fixa:'Fixo todo mês'},freq0)}</select></label></div>
    <div class="two" data-only="parc"><label>Parcelas<select id="f-parc" name="parcelas">${[...Array(23)].map((_,i)=>`<option value="${i+2}" ${i+2===n?'selected':''}>${i+2}x</option>`).join('')}</select></label><label>1ª fatura em<input id="f-fat" name="mesFatura" type="month" value="${fat0}"></label></div>
    <label data-only="fatura">Entra na fatura de<input id="f-fat1" name="mesFatura1" type="month" value="${fat0}"></label>
    <label data-only="fixa">Dia do vencimento<input id="f-dia" name="dia" type="number" min="1" max="31" inputmode="numeric" value="${+d0.slice(8,10)}"></label>
    <div class="hint" id="f-parc-hint"></div>
    ${!isNew&&n>1&&t.forma==='credito'?parcTimeline(t):''}`;
  const del = isNew?'':`<button type="button" class="btn danger" data-act="del-lanc" data-id="${esc(t.id)}">Excluir</button>`;
  openSheet(isNew?'Novo lançamento':'Editar lançamento',body,async fd=>{
    const tipo=fd.get('tipo'), freq=tipo==='despesa'?fd.get('freq'):'unica', forma=tipo==='receita'?'pix':fd.get('forma');
    const v=parseMoney(fd.get('valor')); if(!(v>0)) return 'Informe um valor maior que zero.';
    const data=fd.get('data')||today();
    const cat=tipo==='receita'?'renda':fd.get('cat');
    const desc=(fd.get('desc')||'').trim()||catName(cat);
    if(freq==='fixa'){
      const dia=Math.min(31,Math.max(1,parseInt(fd.get('dia'))||+data.slice(8,10))), m0=data.slice(0,7), pagas={};
      if(forma!=='credito'&&data<=today()) pagas[m0]=data;
      const f={nome:desc,valor:v,cat,quem:fd.get('quem'),dia,inicio:m0,fim:'',ativo:true,forma,pagas,criado:Date.now()};
      let ok=await safe(()=>saveDoc('fixas',f));
      if(ok&&!isNew) ok=await safe(()=>delDoc('lanc',t.id));
      if(ok) toast(`Conta fixa criada: entra todo mês, vence dia ${dia}. Fica em Contas.`);
      return ok;
    }
    const parcelas=freq==='parc'?(parseInt(fd.get('parcelas'))||2):1;
    const mesFatura=forma==='credito'?((freq==='parc'?fd.get('mesFatura'):fd.get('mesFatura1'))||data.slice(0,7)):data.slice(0,7);
    const o={...(isNew?{}:t),tipo,desc,valor:Math.round(v*parcelas*100)/100,data,cat,
      quem:tipo==='receita'?fd.get('quemr'):fd.get('quem'),forma,parcelas,mesFatura};
    if(isNew) o.criado=Date.now();
    const ok=await safe(()=>saveDoc('lanc',o));
    if(ok){ toast(isNew?'Lançado.':'Lançamento atualizado.'); if(isNew&&data.slice(0,7)!==month&&parcelas===1) toast(`Lançado em ${labelLong(data.slice(0,7))}.`); }
    return ok;
  },del);
  const form=$('#sheetForm'); let catTouched=!isNew;
  const sync=()=>{
    const tipo=form.querySelector('[name=tipo]:checked').value, forma=form.forma.value, freq=form.freq.value, desp=tipo==='despesa';
    const vis={despesa:desp,receita:!desp,parc:desp&&freq==='parc',fatura:desp&&freq==='unica'&&forma==='credito',fixa:desp&&freq==='fixa'};
    form.querySelectorAll('[data-only]').forEach(el=>{el.hidden=!vis[el.dataset.only];});
    const n=parseInt(form.parcelas.value)||2, v=parseMoney(form.valor.value), data=form.data.value||today(), h=$('#f-parc-hint');
    let txt='';
    if(vis.parc&&v>0) txt=`Valor da <b>parcela</b>. Total: <b>${fmt(v*n)}</b> em ${n}x, de ${esc(labelShort(form.mesFatura.value||month))} a ${esc(labelShort(addM(form.mesFatura.value||month,n-1)))}.`;
    else if(vis.fatura) txt='À vista no cartão: entra na fatura escolhida.';
    else if(vis.fixa) txt=`Vai para <b>Contas fixas</b> e entra todo mês a partir de ${esc(labelShort(data.slice(0,7)))}, vencendo no dia ${esc(form.dia.value||'—')}.${forma!=='credito'&&data<=today()?' Este mês já fica marcado como pago.':''}`;
    h.innerHTML=txt;
    form.valor.closest('label').firstChild.textContent = vis.parc?'Valor da parcela (R$)':vis.fixa?'Valor por mês (R$)':'Valor (R$)';
  };
  form.addEventListener('change',e=>{
    const nm=e.target.name;
    if(nm==='cat') catTouched=true;
    if(nm==='freq'&&e.target.value==='parc') form.forma.value='credito';
    if(nm==='forma'&&e.target.value!=='credito'&&form.freq.value==='parc') form.freq.value='unica';
    if(nm==='data'&&isNew){ const d=e.target.value; form.mesFatura.value=d.slice(0,7); form.mesFatura1.value=d.slice(0,7); form.dia.value=+d.slice(8,10)||form.dia.value; }
    sync();
  });
  form.addEventListener('input',e=>{
    if(e.target.name==='valor'||e.target.name==='dia') sync();
    if(e.target.name==='desc'&&!catTouched){
      const d=e.target.value.trim().toLowerCase(); if(d.length<3){$('#f-guess').textContent='';return;}
      const prev=[...S.lanc].reverse().find(x=>x.tipo!=='receita'&&(x.desc||'').toLowerCase()===d);
      let c=prev?.cat, why=prev?'como da última vez':'';
      if(!c){ const hit=PALAVRAS.find(([re])=>re.test(d)); if(hit){c=hit[1];why='pela descrição';} }
      if(c){ form.cat.value=c; if(prev){form.quem.value=prev.quem||form.quem.value; form.forma.value=prev.forma||form.forma.value;} $('#f-guess').innerHTML=`Categoria <b>${esc(catName(c))}</b> escolhida ${why}.`; sync(); }
      else $('#f-guess').textContent='';
    }
  });
  sync();
}
function fixaForm(f){
  const isNew=!f; f=f||{nome:'',valor:'',cat:'moradia',quem:'casal',dia:'',inicio:month,fim:'',ativo:true};
  openSheet(isNew?'Nova conta fixa':'Editar conta fixa',`
    <label>Nome<input name="nome" value="${esc(f.nome)}" placeholder="Ex.: Aluguel, Luz, Internet" autocomplete="off"></label>
    <div class="two"><label>Valor mensal (R$)<input name="valor" inputmode="decimal" value="${money(f.valor)}" placeholder="0,00"></label><label>Dia do vencimento<input name="dia" type="number" min="1" max="31" inputmode="numeric" value="${esc(f.dia||'')}"></label></div>
    <div class="two"><label>Categoria<select name="cat">${catOpts(f.cat)}</select></label><label>Quem paga<select name="quem">${opts(PESSOAS,f.quem||'casal')}</select></label></div>
    <label>Forma de pagamento<select name="forma">${opts(FORMAS,f.forma||'pix')}</select></label>
    <div class="two"><label>Começa em<input name="inicio" type="month" value="${esc(f.inicio||month)}"></label><label>Termina em (opcional)<input name="fim" type="month" value="${esc(f.fim||'')}"></label></div>
    <div class="hint">Contas de valor variável (como luz): coloquem a média e ajustem quando a conta chegar.</div>`,
  async fd=>{
    const v=parseMoney(fd.get('valor')); if(!(v>0)) return 'Informe o valor mensal.';
    if(!(fd.get('nome')||'').trim()) return 'Dê um nome para a conta.';
    const o={...(isNew?{pagas:{}}:f),nome:fd.get('nome').trim(),valor:v,dia:parseInt(fd.get('dia'))||'',cat:fd.get('cat'),quem:fd.get('quem'),forma:fd.get('forma')||'pix',inicio:fd.get('inicio')||month,fim:fd.get('fim')||'',ativo:true};
    const ok=await safe(()=>saveDoc('fixas',o)); if(ok) toast('Conta salva.'); return ok;
  }, isNew?'':`<button type="button" class="btn danger" data-act="del-fixa" data-id="${esc(f.id)}">Excluir</button>`);
}
function metaForm(g){
  const isNew=!g; const cm=curYM(); g=g||{nome:'',tipo:'compra',valor:'',prazo:addM(cm,6),inicial:0};
  const B=planBase(); const s=summary(cm);
  const essMes = Object.entries(s.cat).reduce((a,[c,v])=>a+(catGroup(c)==='ess'?v.fixa+v.parc:0),0) + Object.entries(B.cat).filter(([c])=>catGroup(c)==='ess').reduce((a,[,v])=>a+v,0);
  const reserva=Math.round(essMes*6/100)*100;
  openSheet(isNew?'Nova meta':'Editar meta',`
    <div class="seg2" role="radiogroup" aria-label="Tipo de meta"><label><input type="radio" name="tipo" value="compra" ${g.tipo!=='reserva'?'checked':''}>Comprar algo</label><label><input type="radio" name="tipo" value="reserva" ${g.tipo==='reserva'?'checked':''}>Reserva / poupança</label></div>
    <label>O que é<input name="nome" value="${esc(g.nome)}" placeholder="Ex.: Sofá novo, Viagem, Carro" autocomplete="off"></label>
    <div class="two"><label>Valor (R$)<input name="valor" id="m-valor" inputmode="decimal" value="${money(g.valor)}" placeholder="0,00"></label><label>Quando querem<input name="prazo" type="month" value="${esc(g.prazo||addM(cm,6))}"></label></div>
    <label>Já têm guardado (R$)<input name="inicial" inputmode="decimal" value="${money(num(g.inicial))}" placeholder="0,00"></label>
    ${reserva>0?`<div class="hint">Reserva de emergência ideal: 6 meses dos gastos essenciais = <b>${fmt0(reserva)}</b>. <button type="button" class="btn sm ghost" data-act="use-reserva" data-v="${reserva}" style="margin-left:4px">Usar este valor</button></div>`:''}
    <div class="hint" id="m-prev"></div>`,
  async fd=>{
    const v=parseMoney(fd.get('valor')); if(!(v>0)) return 'Informe o valor da meta.';
    if(!(fd.get('nome')||'').trim()) return 'Dê um nome para a meta.';
    const ini=parseMoney(fd.get('inicial'));
    const o={...(isNew?{criado:Date.now()}:g),nome:fd.get('nome').trim(),tipo:fd.get('tipo'),valor:v,prazo:fd.get('prazo')||addM(cm,6),inicial:ini>0?ini:0};
    const ok=await safe(()=>saveDoc('metas',o)); if(ok) toast('Meta salva. Veja o plano no card.'); return ok;
  }, isNew?'':`<button type="button" class="btn danger" data-act="del-meta" data-id="${esc(g.id)}">Excluir</button>`);
  const form=$('#sheetForm');
  const prev=()=>{const v=parseMoney(form.valor.value),ini=parseMoney(form.inicial.value)||0,pz=form.prazo.value; if(v>0&&pz){const m=Math.max(1,diffM(cm,pz)+1);$('#m-prev').innerHTML=`Isso dá <b>${fmt0(Math.max(0,v-ini)/m)}/mês</b> por ${m} ${m===1?'mês':'meses'}.`;} else $('#m-prev').textContent='';};
  form.addEventListener('input',prev); form.addEventListener('change',prev); prev();
}
function aporteForm(metaId,valor){
  const cm=curYM(); const gs=S.metas.filter(g=>goalRest(g)>0||g.id===metaId);
  if(!gs.length){ toast('Cadastrem uma meta primeiro.'); return; }
  openSheet('Guardar dinheiro',`
    <label>Para qual meta<select name="meta">${gs.map(g=>`<option value="${esc(g.id)}" ${g.id===metaId?'selected':''}>${esc(g.nome)}</option>`).join('')}</select></label>
    <div class="two"><label>Valor (R$)<input name="valor" inputmode="decimal" value="${valor?brl2.format(valor):''}" placeholder="0,00"></label><label>Mês<input name="mes" type="month" value="${esc(month>cm?cm:month)}"></label></div>
    <label>Quem guardou<select name="quem">${opts(PESSOAS,'casal')}</select></label>
    <div class="hint">O valor guardado sai da sobra do mês e soma no progresso da meta.</div>`,
  async fd=>{
    const v=parseMoney(fd.get('valor')); if(!(v>0)) return 'Informe quanto guardaram.';
    const ok=await safe(()=>saveDoc('aportes',{meta:fd.get('meta'),valor:v,mes:fd.get('mes')||cm,quem:fd.get('quem'),criado:Date.now()}));
    if(ok) toast(`${fmt0(v)} guardados.`); return ok;
  });
}
function parcTimeline(t){
  const n=parseInt(t.parcelas)||1, st=t.mesFatura||t.data.slice(0,7), v=num(t.valor)/n, cm=curYM(); let pagas=0;
  const rows=[...Array(n)].map((_,i)=>{const m=addM(st,i), p=t.pagas?.[m]; if(p) pagas++;
    return `<div class="tr"><b class="num">${i+1}/${n}</b><span>${esc(labelShort(m))} · ${p?`<span class="pos">${esc(paidTxt(p))}</span>`:m<cm?'<span class="neg">não marcada</span>':'<span class="muted">a pagar</span>'}</span><span class="num">${fmt(v)}</span></div>`;}).join('');
  return `<div><div class="hint" style="margin-bottom:6px"><b>${pagas} de ${n}</b> parcelas pagas · faltam ${fmt(v*(n-pagas))}. Marquem em Contas › Fatura do cartão.</div><div class="tl">${rows}</div></div>`;
}
function fonteForm(f){
  const isNew=!f; f=f||{nome:'Salário',quem:'p1',quando:'5du',dia:20,valor:''};
  openSheet(isNew?'Novo salário / recebimento':'Editar recebimento',`
    <div class="two"><label>De quem<select name="quem">${opts({p1:P1(),p2:P2()},f.quem)}</select></label><label>Nome<input name="nome" value="${esc(f.nome)}" placeholder="Salário, Adiantamento…" autocomplete="off"></label></div>
    <div class="two"><label>Quando cai<select name="quando">${opts({'5du':'5º dia útil',dia:'Dia fixo do mês'},f.quando)}</select></label><label data-only="dia">Dia<input name="dia" type="number" min="1" max="31" inputmode="numeric" value="${esc(f.dia||20)}"></label></div>
    <label>Valor previsto (R$)<input name="valor" inputmode="decimal" value="${money(f.valor)}" placeholder="0,00"></label>
    <div class="hint" id="fo-prev"></div>`,
  async fd=>{
    const v=parseMoney(fd.get('valor')); if(!(v>0)) return 'Informe o valor previsto.';
    const o={id:f.id||newId(),nome:(fd.get('nome')||'').trim()||'Salário',quem:fd.get('quem'),quando:fd.get('quando'),dia:Math.min(31,Math.max(1,parseInt(fd.get('dia'))||20)),valor:v};
    const list=fontes().filter(x=>x.id!==o.id).concat(o).sort((a,b)=>a.quem.localeCompare(b.quem)||(a.quando==='5du'?-1:1)-(b.quando==='5du'?-1:1));
    const ok=await safe(()=>saveCfg({...S.cfg,fontes:list})); if(ok) toast('Salário salvo.'); return ok;
  }, isNew?'':`<button type="button" class="btn danger" data-act="del-fonte" data-id="${esc(f.id)}">Excluir</button>`);
  const form=$('#sheetForm');
  const sync=()=>{ const q=form.quando.value; form.querySelector('[data-only=dia]').hidden=q!=='dia';
    const tmp={quando:q,dia:parseInt(form.dia.value)||20}; const cm=curYM();
    $('#fo-prev').innerHTML='Próximas datas: <b>'+[0,1,2].map(i=>dm(payDate(tmp,addM(cm,i)))).join('</b>, <b>')+'</b>.'; };
  form.addEventListener('input',sync); form.addEventListener('change',sync); sync();
}
function recebForm(fid){
  const f=fontes().find(x=>x.id===fid); if(!f) return;
  const r=S.receb.find(x=>x.fonte===f.id&&x.mes===month), d=payDate(f,month);
  const last=S.receb.filter(x=>x.fonte===f.id&&x.mes<month).sort((a,b)=>b.mes.localeCompare(a.mes))[0];
  openSheet(`${PESSOAS[f.quem]||''} · ${f.nome}`,`
    <div class="hint">${esc(labelLong(month))} · ${esc(whenTxt(f))}: cai em <b>${dm(d)}</b>. Previsto ${fmt(num(f.valor))}${last?` · mês passado caiu ${fmt(num(last.valor))}`:''}.</div>
    <div class="two"><label>Valor que caiu (R$)<input name="valor" inputmode="decimal" value="${money(r?num(r.valor):num(f.valor))}"></label><label>Data<input name="data" type="date" value="${esc(r?.data||(d<=today()||month<curYM()?d:today()))}"></label></div>
    <div class="hint">O que sobrar no mês soma no saldo acumulado.</div>`,
  async fd=>{
    const v=parseMoney(fd.get('valor')); if(!(v>0)) return 'Informe o valor recebido.';
    const o={id:r?.id||(f.id+'_'+month),fonte:f.id,quem:f.quem,nome:f.nome,mes:month,valor:v,data:fd.get('data')||today(),criado:r?.criado||Date.now()};
    const ok=await safe(()=>saveDoc('receb',o)); if(ok) toast(`${fmt0(v)} registrados.`); return ok;
  }, r?`<button type="button" class="btn danger" data-act="del-receb" data-id="${esc(r.id)}">Desfazer</button>`:'');
}
function nomesForm(){
  openSheet('Nomes',`
    <label>Pessoa 1<input name="p1" value="${esc(P1())}" autocomplete="off" maxlength="30"></label>
    <label>Pessoa 2<input name="p2" value="${esc(P2())}" autocomplete="off" maxlength="30"></label>
    <div class="hint">Os lançamentos já feitos acompanham a troca de nome.</div>`,
  async fd=>{ const ok=await safe(()=>saveCfg({...S.cfg,nomes:{p1:(fd.get('p1')||'').trim(),p2:(fd.get('p2')||'').trim()}})); if(ok) toast('Nomes salvos.'); return ok; });
}
function saldoForm(){
  const dt=S.cfg.saldoData||today();
  openSheet('Saldo em conta',`
    <label>Quanto vocês têm na conta (R$)<input name="saldo" inputmode="decimal" value="${money(num(S.cfg.saldoInicial))}" placeholder="0,00"></label>
    <label>Data desse saldo<input name="data" type="date" value="${esc(dt)}" max="${today()}"></label>
    <div class="hint">Coloquem o saldo de agora. Daqui em diante, lancem só os gastos e recebimentos novos: o que aconteceu antes já está nesse valor. Não contem o dinheiro já separado para metas. Saldo negativo: use o sinal de menos.</div>`,
  async fd=>{
    const v=parseMoney(fd.get('saldo')), d=fd.get('data')||today(), agora=d===today();
    const ok=await safe(()=>saveCfg({...S.cfg,saldoInicial:isFinite(v)?v:0,saldoData:d,saldoModo:agora?'agora':'fim',saldoEm:agora?Date.now():0,inicio:d.slice(0,7)}));
    if(ok) toast('Saldo salvo.'); return ok;
  });
}
function limForm(){
  const L=S.cfg.limites||{}; const B=baseline(curYM())||planBase();
  openSheet('Limites por categoria',`
    <div class="hint">Deixem em branco as categorias sem limite. A média mostrada é do dia a dia (sem fixas e parcelas).</div>
    <div class="limgrid">${CATS.map(([id,nome])=>`<div class="lr"><span>${nome}<small>${B.cat[id]?'média '+fmt0(B.cat[id]):'sem histórico'}</small></span><input name="lim-${id}" inputmode="decimal" value="${num(L[id])?money(num(L[id])):''}" placeholder="—" aria-label="Limite ${nome}"></div>`).join('')}</div>`,
  async fd=>{
    const lim={}; for(const [id] of CATS){const v=parseMoney(fd.get('lim-'+id)); if(v>0) lim[id]=v;}
    const ok=await safe(()=>saveCfg({...S.cfg,limites:lim})); if(ok) toast('Limites salvos.'); return ok;
  },`<button type="button" class="btn ghost" data-act="suggest-lim">Sugerir pelo histórico</button>`);
}

/* ---------- eventos ---------- */
function setMenu(open){ document.body.classList.toggle('menu',open); $('#menubtn').setAttribute('aria-expanded',open); $('#menubtn').setAttribute('aria-label',open?'Fechar menu':'Abrir menu'); if(open) setTimeout(()=>$('.snav a[aria-current="page"]')?.focus({preventScroll:true}),300); }
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('on'); clearTimeout(toast._t); toast._t=setTimeout(()=>t.classList.remove('on'),2600); }
const ACT={
  mprev:()=>{month=addM(month,-1);render();}, mnext:()=>{month=addM(month,1);render();},
  menu:()=>setMenu(!document.body.classList.contains('menu')), 'menu-close':()=>setMenu(false),
  'new-lanc':()=>lancForm(), 'edit-lanc':b=>{const t=S.lanc.find(x=>x.id===b.dataset.id); if(t) lancForm(t);},
  'new-fixa':()=>fixaForm(), 'edit-fixa':b=>{const f=S.fixas.find(x=>x.id===b.dataset.id); if(f) fixaForm(f);},
  'new-meta':()=>metaForm(), 'edit-meta':b=>{const g=S.metas.find(x=>x.id===b.dataset.id); if(g) metaForm(g);},
  'new-aporte':b=>aporteForm(b.dataset.meta,num(b.dataset.valor)),
  download:()=>downloadBackup(), import:()=>importForm(),
  logout:async()=>{ await sb?.auth.signOut(); },
  forgot:()=>forgotPassword(),
  'edit-lim':()=>limForm(), 'edit-nomes':()=>nomesForm(),
  'new-fonte':()=>fonteForm(), 'edit-fonte':b=>{const f=fontes().find(x=>x.id===b.dataset.id); if(f) fonteForm(f);},
  receb:b=>recebForm(b.dataset.fonte), 'edit-saldo':()=>saldoForm(),
  'toggle-sab':async()=>{ if(await safe(()=>saveCfg({...S.cfg,sabadoUtil:S.cfg.sabadoUtil!==true}))) toast('Datas recalculadas.'); },
  'go-month':b=>{month=b.dataset.m; render(); document.getElementById('pagamentos')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});},
  pay:async b=>{const col=b.dataset.kind==='fixa'?'fixas':'lanc'; const o=S[col].find(x=>x.id===b.dataset.id); if(!o) return; const pagas={...(o.pagas||{})}; if(pagas[month]) delete pagas[month]; else pagas[month]=paidDefault(month,col==='fixas'?num(o.dia):10); await safe(()=>saveDoc(col,{...o,pagas}));},
  'pay-fatura':async b=>{ b.disabled=true; const d=paidDefault(month,10); const xs=monthItems(month).filter(x=>x.t&&x.k!=='rec'&&x.t.forma==='credito'&&!x.t.pagas?.[month]); for(const x of xs){ if(!await safe(()=>saveDoc('lanc',{...x.t,pagas:{...(x.t.pagas||{}),[month]:d}}))) return; } toast(`Fatura de ${labelShort(month)} marcada como paga.`); },
  'del-receb':async b=>{ if(b.dataset.sure!=='1'){b.dataset.sure='1';b.textContent='Toque de novo para desfazer';return;} if(await safe(()=>delDoc('receb',b.dataset.id))){closeSheet();toast('Recebimento desfeito.');} },
  'del-fonte':async b=>{ if(b.dataset.sure!=='1'){b.dataset.sure='1';b.textContent='Toque de novo para excluir';return;} const list=fontes().filter(x=>x.id!==b.dataset.id); if(await safe(()=>saveCfg({...S.cfg,fontes:list,salarios:{}}))){closeSheet();toast('Excluído. Os valores já recebidos continuam no histórico.');} },
  close:()=>closeSheet(),
  quem:b=>{ui.quem=b.dataset.q;render();},
  chart:b=>{ui.chart=b.dataset.c; try{localStorage.setItem('financas-grafico',ui.chart);}catch(e){} render();},
  'use-reserva':b=>{const f=$('#sheetForm'); f.valor.value=brl2.format(num(b.dataset.v)); f.querySelector('[name=tipo][value=reserva]').checked=true; if(!f.nome.value) f.nome.value='Reserva de emergência'; f.valor.dispatchEvent(new Event('input',{bubbles:true}));},
  'suggest-lim':()=>{const B=baseline(curYM())||planBase(); const f=$('#sheetForm'); let n=0; for(const [id] of CATS){const v=B.cat[id]; if(v>0){ const lim=catGroup(id)==='est'?Math.floor(v*(1-(CAT[id].corte*.5))/10)*10:r10(v); f['lim-'+id].value=brl2.format(Math.max(10,lim)); n++; }} toast(n?'Sugestão: essenciais na média e estilo de vida com um corte leve.':'Ainda não há histórico de gastos para sugerir.');},
  'del-lanc':async b=>{ if(b.dataset.sure!=='1'){b.dataset.sure='1';b.textContent='Toque de novo para excluir';return;} if(await safe(()=>delDoc('lanc',b.dataset.id))){closeSheet();toast('Lançamento excluído.');} },
  'del-fixa':async b=>{ if(b.dataset.sure!=='1'){b.dataset.sure='1';b.textContent='Toque de novo para excluir';return;} if(await safe(()=>delDoc('fixas',b.dataset.id))){closeSheet();toast('Conta excluída.');} },
  'del-meta':async b=>{ if(b.dataset.sure!=='1'){b.dataset.sure='1';b.textContent='Toque de novo para excluir';return;} const id=b.dataset.id; if(await safe(()=>delDoc('metas',id))){ for(const a of S.aportes.filter(a=>a.meta===id)) await safe(()=>delDoc('aportes',a.id)); closeSheet();toast('Meta excluída.');} },
  'del-aporte':async b=>{ if(b.dataset.sure!=='1'){b.dataset.sure='1';b.textContent='Confirmar';return;} if(await safe(()=>delDoc('aportes',b.dataset.id))) toast('Depósito apagado.'); },
  demo:()=>{enterDemo(); location.hash='#resumo';},
  'exit-demo':()=>{exitDemo(); if(!fontes().length){ location.hash='#ajustes'; view='ajustes'; render(); fonteForm(); } else render();},
  backup:async()=>{ try{ await navigator.clipboard.writeText(JSON.stringify({exportado:new Date().toISOString(),...S},null,1)); toast('Backup copiado. Cole num e-mail ou nota para guardar.'); }catch(e){ toast('O navegador não deixou copiar.'); } },
};
document.addEventListener('click',e=>{ const b=e.target.closest('[data-act]'); if(!b) return; const fn=ACT[b.dataset.act]; if(fn){ e.preventDefault(); fn(b,e); } });
$('#sheet').addEventListener('click',e=>{ if(e.target.id==='sheet') closeSheet(); });
document.addEventListener('keydown',e=>{ if(e.key!=='Escape') return; if(!$('#sheet').hidden) closeSheet(); else if(document.body.classList.contains('menu')) setMenu(false); });
document.addEventListener('submit',async e=>{
  if(e.target.id!=='sheetForm') return; e.preventDefault();
  if(!sheetSubmit) return;
  const btn=e.target.querySelector('[type=submit]'); btn.disabled=true;
  const r=await sheetSubmit(new FormData(e.target));
  btn.disabled=false;
  if(typeof r==='string'){ toast(r); return; }
  if(r!==false) closeSheet();
});
document.addEventListener('input',e=>{ if(e.target.id==='busca'){ ui.busca=e.target.value; render(); } });
document.addEventListener('submit',e=>{ if(e.target.id==='loginForm') loginSubmit(e); });
window.addEventListener('hashchange',()=>{ const h=location.hash.slice(1); setMenu(false); if(VIEWS_OK.includes(h)){ view=h; render(); window.scrollTo(0,0);} });
document.addEventListener('click',e=>{ const a=e.target.closest('.snav a'); if(a&&a.getAttribute('href')===location.hash) setMenu(false); });

/* 3D: inclinação dos cards com o mouse; no toque, leve afundamento */
let tiltEl=null;
const untilt=()=>{ if(tiltEl){ tiltEl.style.transform=''; tiltEl=null; } };
document.addEventListener('pointermove',e=>{
  if(REDUCE.matches||e.pointerType!=='mouse') return;
  const el=e.target.closest&&e.target.closest('[data-tilt]');
  if(el!==tiltEl) untilt();
  if(!el||$('#view').classList.contains('enter')) return;
  tiltEl=el; const r=el.getBoundingClientRect(), x=(e.clientX-r.left)/r.width-.5, y=(e.clientY-r.top)/r.height-.5;
  el.style.transform=`perspective(1000px) rotateX(${(-y*7).toFixed(2)}deg) rotateY(${(x*9).toFixed(2)}deg) translateZ(6px)`;
  el.style.setProperty('--gx',((x+.5)*100).toFixed(1)+'%'); el.style.setProperty('--gy',((y+.5)*100).toFixed(1)+'%');
});
document.addEventListener('pointerleave',untilt);
document.addEventListener('pointerdown',e=>{ if(REDUCE.matches||e.pointerType==='mouse') return; const el=e.target.closest&&e.target.closest('[data-tilt]'); if(!el||e.target.closest('button,a,input,select')) return; const r=el.getBoundingClientRect(), x=(e.clientX-r.left)/r.width-.5, y=(e.clientY-r.top)/r.height-.5; el.style.transform=`perspective(900px) rotateX(${(y*5).toFixed(2)}deg) rotateY(${(-x*6).toFixed(2)}deg) scale(.985)`; const up=()=>{el.style.transform='';document.removeEventListener('pointerup',up);document.removeEventListener('pointercancel',up);}; document.addEventListener('pointerup',up); document.addEventListener('pointercancel',up); });

/* dica flutuante dos gráficos */
const tip=$('#tip');
function showTip(el,x,y){ tip.textContent=el.dataset.tip; tip.hidden=false; const w=tip.offsetWidth,h=tip.offsetHeight; tip.style.left=Math.max(8,Math.min(innerWidth-w-8,x-w/2))+'px'; tip.style.top=Math.max(8,y-h-14)+'px'; }
document.addEventListener('pointermove',e=>{ const el=e.target.closest&&e.target.closest('[data-tip]'); if(el) showTip(el,e.clientX,e.clientY); else tip.hidden=true; });
document.addEventListener('pointerdown',e=>{ const el=e.target.closest&&e.target.closest('[data-tip]'); if(el) showTip(el,e.clientX,e.clientY); else tip.hidden=true; });
window.addEventListener('scroll',()=>{tip.hidden=true;},{passive:true});

init();
