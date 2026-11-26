(()=>{'use strict';
/* ===== Dữ liệu cũ (assets/js/data.js → window.VLTL) ===== */
const D=window.VLTL||{};
const SUBJ=D.SUBJ||['Bác sĩ','Cử nhân PHCN','Y sĩ','Khác'],TECH=D.TECH||[[],[],[],[]],QS=D.QS||{},KEYS=D.KEYS||[[],[],[],[]],
NQ=D.NQ||[40,60,40,0],NSET=D.NSET||[5,10,5,0],LB=D.LB||[['Thi kết thúc thực hành'],['PRETEST','POSTTEST'],['Thi kết thúc thực hành'],[]],
SCH=D.SCH||{w:{},t7:{},cn:{}},API=D.API,TOKEN=D.TOKEN,OK=!!API;
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LS=(k,d)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},SV=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const norm=x=>String(x||'').trim().toLowerCase().replace(/\s+/g,' ');
const nz=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
let open=LS('open',{}),students=LS('sv',[]),results=LS('res',[]),FILES=[],ROOMS2=null,ERR='',S={},TAB='w',ADM='',UNDO=null;
try{ADM=sessionStorage.getItem('vltl_adm')||''}catch(e){}
const ICON={home:'fa-home',rules:'fa-book',rooms:'fa-th-large',user:'fa-user-md',admin:'fa-lock',file:'fa-file-alt',chart:'fa-chart-pie'};

/* ===== API (giữ nguyên giao thức Apps Script) ===== */
async function api(p,body){const c=new AbortController(),t=setTimeout(()=>c.abort(),20000);
 try{const u=API+'?'+new URLSearchParams({token:TOKEN,origin:location.origin,_t:Date.now(),...p});
  const r=await fetch(u,{cache:'no-store',signal:c.signal,...(body?{method:'POST',body:JSON.stringify(body)}:{})});return await r.json()}finally{clearTimeout(t)}}
async function pull(){if(!OK)return;
 const [c,t]=await Promise.allSettled([api({action:'config'}),api({action:'tree'})]);
 if(c.status==='fulfilled'&&!c.value.error){const v=c.value;open=v.open||{};if(v.students?.length)students=v.students;ROOMS2=v.rooms2||null;SV('open',open);ERR=''}
 else ERR=String(c.reason?.message||c.value?.error||'lỗi kết nối');
 if(t.status==='fulfilled'&&t.value.files)FILES=t.value.files}

/* ===== Tiện ích UI ===== */
function toast(m,bad,undo){const d=document.createElement('div');d.className='toast-i'+(bad?' bad':'');d.setAttribute('role','status');
 d.innerHTML=`<span>${esc(m)}</span>`+(undo?'<button type="button">Hoàn tác</button>':'');
 if(undo)$('button',d).onclick=()=>{undo();d.remove()};$('#toasts').appendChild(d);setTimeout(()=>d.remove(),undo?7000:3500)}
function modal(html,cls=''){const m=document.createElement('div');m.className='md';m.innerHTML=`<div class="box ${cls}" role="dialog" aria-modal="true">${html}</div>`;
 m.addEventListener('click',e=>{if(e.target===m)m.remove()});document.body.appendChild(m);return m}
function ask({title,msg,input,ok='Đồng ý'}){return new Promise(res=>{
 const m=modal(`<h5>${esc(title)}</h5><p class="text-muted">${esc(msg||'')}</p>${input?`<input class="form-control mb-3" id="ai" type="${input}" autocomplete="off">`:''}<div class="d-flex justify-content-end" style="gap:8px"><button class="btn btn-soft" data-r="0">Hủy</button><button class="btn btn-primary" data-r="1">${esc(ok)}</button></div>`);
 const i=$('#ai',m);(i||$('[data-r="1"]',m)).focus();const end=v=>{m.remove();res(v)};
 $$('[data-r]',m).forEach(b=>b.onclick=()=>end(b.dataset.r==='1'?(i?i.value:true):(i?null:false)));
 i&&(i.onkeydown=e=>{if(e.key==='Enter')end(i.value);if(e.key==='Escape')end(null)})})}
const initials=n=>String(n||'?').trim().split(/\s+/).slice(-2).map(w=>w[0]).join('').toUpperCase();
const spark=(v,c='#3f6ad8')=>{if(v.length<2)return'';const mx=Math.max(...v,1),mn=Math.min(...v,0),p=v.map((y,i)=>`${i*(80/(v.length-1))},${32-(y-mn)/((mx-mn)||1)*28}`).join(' ');
 return `<svg class="spark" viewBox="0 0 80 34" aria-hidden="true"><polyline fill="none" stroke="${c}" stroke-width="2" points="${p}"/></svg>`};
const skeleton=()=>`<div class="row">${[1,2,3,4].map(()=>'<div class="col-md-6 col-xl-3"><div class="sk" style="height:92px;margin-bottom:24px"></div></div>').join('')}</div><div class="sk" style="height:220px"></div>`;
const view=$('#view');
function head(ic,t,s,act=''){$('#pt').innerHTML=`<div class="pt-ic"><i class="fas ${ic}" aria-hidden="true"></i></div><div><div class="pt-t">${esc(t)}</div><div class="pt-s">${esc(s||'')}</div></div><div class="pt-act">${act}</div>`;document.title=t+' | Khoa VLTL – PHCN'}
const printHead=t=>`<div class="print-head"><img src="logo.png" alt=""><div><b>BỆNH VIỆN Y HỌC CỔ TRUYỀN TP. HỒ CHÍ MINH</b>Khoa VLTL – PHCN · ${esc(t)}</div></div>`;
const crumb=(extra='')=>`<div class="mb-3 no-print d-flex" style="gap:8px"><button class="btn btn-soft" onclick="history.back()" aria-label="Quay lại"><i class="fas fa-arrow-left"></i> Quay lại</button><a class="btn btn-soft" href="#/">Trang chủ</a>${extra}</div>`;

/* ===== Menu / điều hướng ===== */
const MENU=[['h','Menu chính'],['#/','Trang chủ','home'],['#/noiquy','Nội quy','rules'],['#/phanphong','Danh sách phân phòng','rooms'],
 ['h','Đối tượng thực hành'],...SUBJ.map((s,i)=>['#/doituong/'+i,s,'user']),['h','Quản trị'],['#/quantri','Quản trị viên','admin']];
$('#menu').innerHTML=MENU.map(m=>m[0]==='h'?`<h6>${m[1]}</h6>`:`<a href="${m[0]}" data-h="${m[0]}"><i class="fas ${ICON[m[2]]}" aria-hidden="true"></i><span>${m[1]}</span></a>`).join('');
try{new PerfectScrollbar('#menu')}catch(e){}
$('#btnSb').onclick=()=>innerWidth>991?document.body.classList.toggle('mini'):document.body.classList.toggle('open');
$('#sbMask').onclick=()=>document.body.classList.remove('open');
$('#btnTheme').onclick=()=>{const t=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=t;try{localStorage.setItem('vltl_theme',t)}catch(e){}};
$('#btnAdm').onclick=()=>{location.hash='#/quantri'};
$('#btnBell').onclick=()=>{const p=pendingCount();toast(p?p+' bài thi chưa đồng bộ lên Drive':'Không có thông báo mới')};

/* ===== Tìm kiếm tức thời + phím tắt "/" ===== */
const q=$('#q'),qr=$('#qres');
document.addEventListener('keydown',e=>{if(e.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)){e.preventDefault();q.focus()}if(e.key==='Escape'){qr.hidden=true;q.blur()}});
q.addEventListener('input',()=>{const k=nz(q.value);if(k.length<2){qr.hidden=true;return}
 const r=[];MENU.filter(m=>m[0]!=='h'&&nz(m[1]).includes(k)).forEach(m=>r.push([m[0],m[1],'Trang']));
 TECH.forEach((L,i)=>L.forEach(t=>{if(r.length<10&&nz(t[0]).includes(k))r.push(['#/kythuat/'+i+'?q='+encodeURIComponent(q.value),t[0].replace(/^\d+\.\s*/,''),SUBJ[i]])}));
 qr.innerHTML=r.slice(0,10).map(x=>`<a href="${x[0]}"><b>${esc(x[1])}</b><small>${esc(x[2])}</small></a>`).join('')||'<a>Không có kết quả</a>';qr.hidden=false});
qr.addEventListener('click',()=>{qr.hidden=true;q.value=''});

/* ===== Drive / PDF ===== */
const inSubj=(f,si)=>f.path.some(x=>{const n=' '+nz(x)+' ';return n.includes(' '+['bac si','cu nhan','y si','khac'][si]+' ')||(si===1&&(n.includes(' ky thuat vien ')||n.includes(' ktv ')))});
const subjFiles=(si,kw,pdf=true)=>FILES.filter(f=>inSubj(f,si)&&nz(f.path.join(' ')+' '+f.name).includes(kw)&&(!pdf||/pdf/i.test(f.mime)));
const findAny=kw=>FILES.filter(f=>nz(f.path.join(' ')+' '+f.name).includes(kw));
const bkFiles=i=>{let L=subjFiles(i,'bang kiem',false);if(!L.length)L=FILES.filter(f=>![0,1,2,3].some(x=>inSubj(f,x))&&nz(f.path.join(' ')+' '+f.name).includes('bang kiem'));return L.slice().sort((a,b)=>a.name.localeCompare(b.name,'vi',{numeric:true}))};
function openDrive(id,title,hint){const m=modal(`<div class="d-flex align-items-center mb-2" style="gap:12px;color:#fff;flex-wrap:wrap"><button class="btn btn-light" id="x">✕ Đóng</button><b>${esc(title)}</b><span>${esc(hint||'')}</span><a style="color:#fff" target="_blank" rel="noopener" href="https://drive.google.com/file/d/${id}/view">Mở trong Drive</a></div><iframe title="${esc(title)}" src="https://drive.google.com/file/d/${id}/preview"></iframe>`,'wide');$('#x',m).onclick=()=>m.remove()}
function openTech(si,u,title){const [p,pg]=u.split('#page=');const L=subjFiles(si,'qtkt');if(!L.length)return toast(OK?'Chưa thấy file PDF QTKT của đối tượng này trên Drive':'Chưa cấu hình kết nối Drive',1);
 const nt=nz(title),m=L.find(f=>{const n=nz(f.name.replace(/\.pdf$/i,''));return n.length>=8&&nt.length>=8&&(n.includes(nt)||nt.includes(n))})||L.slice().sort((a,b)=>b.size-a.size)[0];
 openDrive(m.id,title,'Kỹ thuật bắt đầu ở trang '+(parseInt(pg)||1))}

/* ===== Trang chủ ===== */
const LEAD=[['Trưởng khoa','BS.CKII Nguyễn Thị Ly Châu'],['Phó Trưởng khoa','KTY.CKI.PHCN Võ Anh Khoa'],['Kỹ thuật viên Trưởng khoa','KTY.CKI.PHCN Huỳnh Thị Mỹ Hương'],['Trưởng Đơn vị điều trị đau','BS.CKI Lê Hữu Phúc']];
const R={};
R.home=()=>{head('fa-home','Bảng điều khiển','Quản lý đào tạo học viên thực hành');
 const ex=results.filter(r=>r.type!=='wheel'),pass=ex.filter(r=>+r.sc>=5).length,on=Object.values(open).filter(o=>o&&o.on).length,tr=ex.slice(-8).map(r=>+r.sc||0);
 const W=(ic,cls,n,l,sp)=>`<div class="col-md-6 col-xl-3"><div class="card widget"><div class="wi ${cls}"><i class="fas ${ic}"></i></div><div><div class="wn">${n}</div><div class="wl">${l}</div></div>${sp||''}</div></div>`;
 view.innerHTML=`<div class="hero"><h2>Chào mừng học viên đến thực hành tại khoa VLTL – PHCN</h2><div>Nội quy, phân phòng, danh mục kỹ thuật, ôn tập và thi kết thúc thực hành.</div></div>
 <div class="row">${W('fa-users','s-pr',students.length,'Học viên',spark([2,3,3,5,4,6,students.length||6]))}${W('fa-file-signature','s-in',ex.length,'Bài thi đã nộp',spark(tr))}${W('fa-check-circle','s-ok',pass,'Đạt (≥ 5 điểm)')}${W('fa-door-open','s-wa',on,'Mục thi đang mở')}</div>
 <div class="row">${LEAD.map(l=>`<div class="col-md-6 col-xl-3"><div class="card lead-card"><div class="card-body"><small class="text-muted">${l[0]}</small><b>${l[1]}</b></div></div></div>`).join('')}</div>
 <div class="row"><div class="col-md-6"><a class="card link" href="#/noiquy" style="text-decoration:none"><div class="card-body"><h5><i class="fas fa-book text-primary"></i> Nội quy</h5><span class="text-muted">Học viên bắt buộc tuân thủ nội quy; xem đơn xin nghỉ phép.</span></div></a></div>
 <div class="col-md-6"><a class="card link" href="#/phanphong" style="text-decoration:none"><div class="card-body"><h5><i class="fas fa-th-large text-primary"></i> Danh sách phân phòng</h5><span class="text-muted">Sơ đồ phòng thực hành theo ca.</span></div></a></div></div>
 <div class="card"><div class="card-header">Đối tượng thực hành</div><div class="card-body"><div class="row">${SUBJ.map((s,i)=>`<div class="col-6 col-xl-3 mb-2"><a class="btn btn-soft btn-block py-3" href="#/doituong/${i}"><i class="fas fa-user-md"></i> ${s}</a></div>`).join('')}</div></div></div>`};

/* ===== Nội quy ===== */
R.rules=()=>{head('fa-book','Nội quy','Nội quy và đơn xin nghỉ phép của Khoa');
 const fl=kw=>findAny(kw).map(f=>`<div class="d-flex align-items-center py-2 border-bottom" style="gap:10px"><i class="fas fa-file-pdf text-danger"></i><span class="flex-fill">${esc(f.name.replace(/\.[a-z0-9]+$/i,'').replace(/_/g,' '))}</span><button class="btn btn-soft btn-sm" data-id="${f.id}" data-n="${esc(f.name)}">Xem</button><a class="btn btn-soft btn-sm" target="_blank" rel="noopener" href="https://drive.google.com/uc?export=download&id=${f.id}">Tải về</a></div>`).join('')||'<p class="text-muted mb-0">Chưa có file trên Drive.</p>';
 view.innerHTML=crumb()+`<div class="alert alert-primary">Các học viên bắt buộc tuân thủ đúng các nội quy của Khoa.</div><div class="row"><div class="col-lg-6"><div class="card"><div class="card-header">Nội quy của Khoa</div><div class="card-body">${fl('noi quy')}</div></div></div><div class="col-lg-6"><div class="card"><div class="card-header">Đơn xin nghỉ phép</div><div class="card-body">${fl('nghi phep')}</div></div></div></div>`;
 $$('[data-id]',view).forEach(b=>b.onclick=()=>openDrive(b.dataset.id,b.dataset.n))};

/* ===== Phân phòng (xem; ưu tiên rooms2 từ máy chủ, dự phòng SCH) ===== */
const TABS={w:'Trong tuần',t7:'Thứ Bảy',cn:'Chủ Nhật'};
const roomPeople=(id)=>ROOMS2&&ROOMS2[TAB]?(ROOMS2[TAB][id]||[]).map(p=>({n:p.k.split('|')[0],note:p.note||''})):(SCH[TAB]?.[id]||'').split(',').filter(Boolean).map(x=>{const [n,note]=x.split('|');return{n,note:note||''}});
const chip=p=>{const r=/^BS\b/i.test(p.n)?'bs':/^YS\b/i.test(p.n)?'ys':'';return `<span class="chp ${r}">${esc(p.n)}${p.note?' · '+esc(p.note):''}</span>`};
const room=(id,t)=>{const L=roomPeople(id);return `<div class="rm" data-n="${nz(L.map(p=>p.n).join(' '))}"><h3>${t}<span>${L.length} học viên</span></h3>${L.map(chip).join('')||'<span class="text-muted">Chưa có học viên</span>'}</div>`};
R.rooms=()=>{head('fa-th-large','Danh sách phân phòng','Sơ đồ phòng và học viên theo từng ca','<button class="btn btn-primary no-print" onclick="print()"><i class="fas fa-print"></i> In</button>');
 view.innerHTML=crumb()+printHead('Danh sách phân phòng – '+TABS[TAB])+`<div class="card no-print"><div class="card-body d-flex flex-wrap" style="gap:8px">${Object.keys(TABS).map(k=>`<button class="btn ${k===TAB?'btn-primary':'btn-soft'}" data-t="${k}">${TABS[k]}</button>`).join('')}<input class="form-control ml-auto" style="max-width:240px" id="rf" placeholder="Lọc theo tên…" aria-label="Lọc học viên"></div></div>
 <div class="card"><div class="card-header">Khu N4</div><div class="card-body"><div class="row"><div class="col-md-5">${room('201-202','P.201 - 202')}${room('208-209','P.208 - 209')}</div><div class="col-md-2"><div class="hall">HÀNH LANG</div></div><div class="col-md-5">${room('204-206','P.204 - 206')}${room('207A','P.207A')}${room('207B','P.207B')}</div></div></div></div>
 <div class="card"><div class="card-header">Khu N6</div><div class="card-body"><div class="row">${[['6.216','P.6.216'],['6.215','P.6.215'],['6.214','P.6.214'],['6.213','P.6.213']].map(r=>`<div class="col-md-6">${room(...r)}</div>`).join('')}</div></div></div>`;
 $$('[data-t]',view).forEach(b=>b.onclick=()=>{TAB=b.dataset.t;R.rooms()});
 $('#rf').oninput=e=>{const k=nz(e.target.value);$$('.rm').forEach(r=>r.style.display=!k||r.dataset.n.includes(k)?'':'none')}};

/* ===== Trang đối tượng ===== */
R.subj=i=>{const s=SUBJ[i];head('fa-user-md',s,'Danh mục kỹ thuật, bảng kiểm, ôn tập và thi');
 const W=(h,ic,cls,n,l)=>`<div class="col-md-4"><a class="card widget link" href="${h}" style="text-decoration:none"><div class="wi ${cls}"><i class="fas ${ic}"></i></div><div><div class="wn">${n}</div><div class="wl">${l}</div></div></a></div>`;
 const ex=(LB[i]||[]).map((l,li)=>{const o=open[s+'|'+l],ok=o&&o.on;return `<div class="col-md-6"><div class="card ${ok?'link':''}" style="${ok?'':'opacity:.7'}" ${ok?`data-ex="${li}"`:''}><div class="card-body d-flex align-items-center" style="gap:12px"><div class="wi ${ok?'s-ok':'s-no'}"><i class="fas ${ok?'fa-pen':'fa-lock'}"></i></div><div><b>${esc(l)}</b><div class="text-muted">${ok?'Đã mở – Đề số '+o.set+' – nhấn để vào thi':ERR?'Lỗi kết nối máy chủ (F5 để thử lại)':'Chờ Quản trị viên mở'}</div></div></div></div></div>`}).join('')||'<div class="col-12"><div class="card"><div class="card-body text-muted">Chưa có bộ đề cho nhóm này.</div></div></div>';
 view.innerHTML=crumb()+`<div class="row">${W('#/kythuat/'+i,'fa-list','s-pr',TECH[i].length,'Kỹ thuật trong danh mục')}${W('#/bangkiem/'+i,'fa-clipboard-check','s-ok',bkFiles(i).length||8,'Bảng kiểm quy trình')}${W('#/ontap/'+i,'fa-question-circle','s-wa',KEYS[i].length*5,'Câu hỏi ôn tập')}</div><h6 class="text-muted mb-3">THI KẾT THÚC THỰC HÀNH</h6><div class="row">${ex}</div>`;
 $$('[data-ex]',view).forEach(c=>c.onclick=()=>location.hash='#/thi/'+i+'/'+c.dataset.ex)};

R.tech=(i,_,qs)=>{head('fa-list','Danh mục kỹ thuật',SUBJ[i]+' · TT 32/2023/TT-BYT');const L=TECH[i]||[];
 view.innerHTML=crumb()+`<div class="card"><div class="card-header">Danh mục kỹ thuật PHCN <span class="badge badge-pill bg-ok">${L.length}</span></div><div class="card-body"><input class="form-control mb-3" id="tf" aria-label="Tìm kỹ thuật" placeholder="Tìm kỹ thuật…" value="${esc(qs||'')}"><div class="ov"><table class="tbl cards"><thead><tr><th>STT</th><th>Kỹ thuật</th><th>Tệp</th></tr></thead><tbody>${L.map(t=>{const n=t[0].replace(/^\d+\.\s*/,'');return `<tr class="click" data-k="${nz(n)}" data-u="${esc(t[1])}" data-n="${esc(n)}"><td data-l="STT">${(t[0].match(/^\d+/)||[''])[0]}</td><td data-l="Kỹ thuật">${esc(n)}</td><td data-l="Tệp"><span class="badge badge-pill ${t[1]?'bg-ok':'bg-mut'}">${t[1]?'PDF':'Chưa có file'}</span></td></tr>`}).join('')||'<tr><td colspan=3 class="text-muted">Chưa có danh mục cho nhóm này.</td></tr>'}</tbody></table></div></div></div>`;
 const f=()=>{const k=nz($('#tf').value);$$('tbody tr[data-k]',view).forEach(r=>r.style.display=r.dataset.k.includes(k)?'':'none')};$('#tf').oninput=f;f();
 $$('tr[data-u]',view).forEach(r=>r.onclick=()=>r.dataset.u&&openTech(i,r.dataset.u,r.dataset.n))};

R.bk=i=>{head('fa-clipboard-check','Bảng kiểm quy trình',SUBJ[i]);const L=bkFiles(i);
 view.innerHTML=crumb()+`<div class="card"><div class="card-header">Bảng kiểm quy trình kỹ thuật</div><div class="card-body">${L.map((f,k)=>`<div class="d-flex align-items-center py-2 border-bottom" style="gap:10px"><span class="av-sm">${k+1}</span><span class="flex-fill">${esc(f.name.replace(/\.[a-z0-9]+$/i,''))}</span><button class="btn btn-soft btn-sm" data-id="${f.id}" data-n="${esc(f.name)}">Xem</button></div>`).join('')||'<p class="text-muted mb-0">Chưa có file bảng kiểm trên Drive.</p>'}</div></div>`;
 $$('[data-id]',view).forEach(b=>b.onclick=()=>openDrive(b.dataset.id,b.dataset.n))};

/* ===== Ôn tập & bộ đề (thuật toán gốc) ===== */
function rng(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function shf(a,r){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function opts(x,r){const o=shf([0,1,2,3],r);return{q:x[0],o:o.map(i=>x[1+i]),a:o.indexOf(0)}}
function setPairs(i,set){const r=rng(97*i+31*set+5),ks=KEYS[i],n=NQ[i],base=Math.floor(n/ks.length);let pick=[],rest=[];
 ks.forEach(k=>{const h=[5,6][Math.floor(r()*2)],o=[h].concat(shf([0,1,2,3,4,5,6].filter(j=>j!=h),r));o.slice(0,base).forEach(j=>pick.push([k,j]));o.slice(base).forEach(j=>rest.push([k,j]))});return pick.concat(shf(rest,r).slice(0,n-pick.length))}
const mkExam=(i,set)=>shf(setPairs(i,set),Math.random).map(p=>{const o=opts(QS[p[0]].q[p[1]],Math.random);o.q='['+QS[p[0]].t+'] '+o.q;return o});
const score=(c,N)=>{const T=N*65/100;return +(c>=T?5+5*(c-T)/(N-T):5*c/T).toFixed(1)};
R.rev=i=>{head('fa-question-circle','Bộ câu hỏi ôn tập',SUBJ[i]);
 view.innerHTML=crumb()+`<div class="alert alert-primary">Mỗi kỹ thuật có 5 câu ôn tập. Mở kỹ thuật để xem câu hỏi; bấm “Đáp án” để kiểm tra.</div>`+KEYS[i].map((k,ti)=>`<details class="card"><summary class="card-header" style="cursor:pointer"><span>${ti+1}. ${esc(QS[k].t)}</span><span class="badge badge-pill bg-ok">5 câu</span></summary><div class="card-body">${QS[k].q.slice(0,5).map((x,j)=>{const o=opts(x,rng(11*j+ti+3));return `<div class="mb-3"><b>Câu ${j+1}.</b> ${esc(o.q)}${o.o.map((t,m)=>`<div class="d-flex" style="gap:10px;padding:3px 0"><span class="ol">${'ABCD'[m]}</span>${esc(t)}</div>`).join('')}<details><summary class="text-muted">Đáp án</summary><b class="text-success">${'ABCD'[o.a]}. ${esc(o.o[o.a])}</b></details></div>`}).join('')}</div></details>`).join('')};

/* ===== Thi ===== */
const fmt=s=>String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
R.exam=async(i,li)=>{const l=LB[i][li];if(OK){view.innerHTML=skeleton();await pull();if(ERR)return toast('Không kết nối được máy chủ: '+ERR,1)}
 const o=open[SUBJ[i]+'|'+l];if(!o||!o.on){toast('Mục thi này chưa được mở.',1);return location.hash='#/doituong/'+i}
 const keep=S.draft||{};S={si:i,li,l,t:SUBJ[i],set:o.set};head('fa-pen','Thi kết thúc thực hành',SUBJ[i]+(i===1?' · '+l:''));
 view.innerHTML=crumb()+`<div class="card" style="max-width:520px;margin:0 auto"><div class="card-header">Thông tin thí sinh</div><div class="card-body"><label for="nm">Họ và tên</label><input class="form-control mb-3" id="nm" placeholder="Nguyễn Văn A" value="${esc(keep.n||'')}"><label for="db">Ngày sinh</label><input class="form-control mb-3" id="db" placeholder="dd/mm/yyyy" value="${esc(keep.d||'')}"><button class="btn btn-primary btn-block" id="go">Tiếp tục</button></div></div>`;
 $('#go').onclick=()=>{const n=$('#nm').value.trim(),d=$('#db').value.trim();if(!n||!d)return toast('Vui lòng nhập đủ họ tên và ngày sinh.',1);S.draft={n,d};
  const f=students.find(s=>norm(s.n)==norm(n)&&norm(s.d)==norm(d))||{n,d,from:'',to:''};S.st=f;
  view.innerHTML=crumb()+`<div class="card" style="max-width:560px;margin:0 auto"><div class="card-header">Xác nhận thông tin</div><div class="card-body"><table class="tbl"><tr><td>Họ tên</td><td><b>${esc(f.n)}</b></td></tr><tr><td>Ngày sinh</td><td><b>${esc(f.d)}</b></td></tr><tr><td>Thực hành tại khoa</td><td><b>${esc(f.from||'?')} – ${esc(f.to||'?')}</b></td></tr><tr><td>Bộ đề</td><td><b>${S.set}</b></td></tr><tr><td>Số câu · Thời gian</td><td><b>${NQ[i]} câu · ${NQ[i]*3/4} phút</b></td></tr></table>${f.from?'':'<p class="text-muted mt-2">Không tìm thấy trong danh sách học viên.</p>'}<button class="btn btn-primary btn-block mt-3" id="st">Xác nhận vào thi</button></div></div>`;
  $('#st').onclick=startExam}};
function startExam(){S.qs=mkExam(S.si,S.set);S.ans={};S.i=0;S.dur=NQ[S.si]*45;S.t0=Date.now();S.left=S.dur;
 S.tm=setInterval(()=>{S.left=S.dur-Math.floor((Date.now()-S.t0)/1000);if(S.left<=0)return submit();const e=$('#tm');if(e)e.textContent=fmt(S.left)},1000);run()}
function run(){const q=S.qs[S.i];$('#pt').innerHTML='';
 view.innerHTML=`<div class="timer"><span>Câu <b>${S.i+1}</b> / ${S.qs.length}</span><b id="tm">${fmt(S.left)}</b></div><div class="exam"><div class="card"><div class="card-body"><div style="font-size:16px;font-weight:600;color:var(--hd)">${esc(q.q)}</div>${q.o.map((o,k)=>`<div class="opt ${S.ans[S.i]===k?'sel':''}" role="radio" tabindex="0" aria-checked="${S.ans[S.i]===k}" data-k="${k}"><span class="ol">${'ABCD'[k]}</span>${esc(o)}</div>`).join('')}<div class="d-flex mt-3" style="gap:8px"><button class="btn btn-soft" data-nv="-1">← Trước</button><button class="btn btn-primary" data-nv="1">Tiếp →</button><button class="btn btn-danger ml-auto" id="sb">Nộp bài</button></div></div></div><div class="card"><div class="card-header">Danh sách câu hỏi</div><div class="card-body pal">${S.qs.map((_,k)=>`<button class="${S.ans[k]!=null?'d':''} ${k===S.i?'cur':''}" data-g="${k}" aria-label="Câu ${k+1}">${k+1}</button>`).join('')}</div></div></div>`;
 $$('.opt',view).forEach(o=>{const f=()=>{S.ans[S.i]=+o.dataset.k;run()};o.onclick=f;o.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();f()}}});
 $$('[data-nv]',view).forEach(b=>b.onclick=()=>{S.i=Math.max(0,Math.min(S.qs.length-1,S.i+ +b.dataset.nv));run()});
 $$('[data-g]',view).forEach(b=>b.onclick=()=>{S.i=+b.dataset.g;run()});
 $('#sb').onclick=async()=>{if(await ask({title:'Nộp bài?',msg:'Bạn đã trả lời '+Object.keys(S.ans).length+'/'+S.qs.length+' câu.',ok:'Nộp bài'}))submit()}}
const pendingCount=()=>LS('vltl_pending_results',[]).length;
async function submit(){clearInterval(S.tm);const tot=S.qs.length,ok=S.qs.filter((q,k)=>S.ans[k]===q.a).length,sc=score(ok,tot);
 const r={n:S.st.n,d:S.st.d,t:S.t,ph:S.l,set:S.set,from:S.st.from||'',to:S.st.to||'',ok,tot,sc,at:new Date().toLocaleString('vi-VN'),qs:S.qs.map(q=>({q:q.q,o:q.o,a:q.a})),ans:S.ans};
 results.push(r);SV('res',results);
 view.innerHTML=`<div class="card" style="max-width:520px;margin:0 auto;text-align:center"><div class="card-header">Kết quả bài thi</div><div class="card-body"><div class="big">${sc}<small style="font-size:18px">/10</small></div><p>Số câu đúng: <b>${ok}/${tot}</b></p><div class="progress"><div class="progress-bar" style="width:${ok/tot*100}%"></div></div><p id="svst" class="text-muted mt-3">${OK?'Đang lưu bài làm lên Google Drive…':''}</p><a class="btn btn-primary" href="#/">Về trang chủ</a></div></div>`;
 if(!OK)return;try{const x=await api({action:'result'},{r:{...r,qs:undefined,ans:undefined},html:`<p>${esc(r.n)} — ${r.sc}/10 (${r.ok}/${r.tot})</p>`});if(x.error)throw new Error(x.error);$('#svst').textContent='Đã lưu bài làm và điểm lên Google Drive.';toast('Đã lưu kết quả lên Drive')}
 catch(e){const p=LS('vltl_pending_results',[]);p.push({r,at:Date.now()});SV('vltl_pending_results',p);$('#bellDot').hidden=false;$('#svst').textContent='Chưa gửi được lên Drive; đã lưu trên máy, sẽ thử lại.';toast('Chưa gửi được lên Drive. Đã lưu máy, sẽ thử lại sau.',1)}}
async function flush(){const q=LS('vltl_pending_results',[]);if(!q.length||!OK)return;const left=[];for(const it of q){try{const x=await api({action:'result'},{r:{...it.r,qs:undefined,ans:undefined},html:''});if(x.error)left.push(it)}catch(e){left.push(it)}}SV('vltl_pending_results',left);$('#bellDot').hidden=!left.length;if(left.length<q.length)toast('Đã đồng bộ '+(q.length-left.length)+' kết quả thi')}
addEventListener('online',flush);

/* ===== Quản trị ===== */
async function login(){const p=await ask({title:'Quản trị viên',msg:'Nhập mật khẩu để vào trang quản trị.',input:'password',ok:'Đăng nhập'});if(!p)return false;
 if(!OK){toast('Chưa cấu hình kết nối Google Drive (API)',1);return false}
 try{const r=await api({action:'auth'},{pin:p});if(r&&r.ok){ADM=p;try{sessionStorage.setItem('vltl_adm',p)}catch(e){}toast('Đã đăng nhập quản trị');return true}toast('Sai mật khẩu',1)}catch(e){toast('Không kết nối được máy chủ',1)}return false}
R.admin=async()=>{if(!ADM&&!(await login()))return location.hash='#/';
 head('fa-lock','Quản trị','Mở thi, chọn đề, danh sách học viên, kết quả','<button class="btn btn-soft" id="lo"><i class="fas fa-sign-out-alt"></i> Thoát quản trị</button>');
 const ex=results.filter(r=>r.type!=='wheel'),pass=ex.filter(r=>+r.sc>=5).length,avg=ex.length?(ex.reduce((a,r)=>a+(+r.sc||0),0)/ex.length).toFixed(1):'—';
 const done=new Set(ex.map(r=>norm(r.n))),notYet=students.filter(s=>!done.has(norm(s.n)));
 const W=(ic,c,n,l)=>`<div class="col-6 col-xl-3"><div class="card widget"><div class="wi ${c}"><i class="fas ${ic}"></i></div><div><div class="wn">${n}</div><div class="wl">${l}</div></div></div></div>`;
 const rows=[0,1,2].map(i=>LB[i].map((l,li)=>{const o=open[SUBJ[i]+'|'+l]||{on:false,set:1};return `<tr><td data-l="Đối tượng">${SUBJ[i]}</td><td data-l="Mục thi">${esc(l)}</td><td data-l="Mở"><div class="custom-control custom-switch"><input type="checkbox" class="custom-control-input" id="sw${i}${li}" data-i="${i}" data-l="${esc(l)}" ${o.on?'checked':''}><label class="custom-control-label" for="sw${i}${li}"><span class="sr-only">Mở ${SUBJ[i]} ${esc(l)}</span></label></div></td><td data-l="Đề số"><select class="form-control form-control-sm" data-set="${i}|${esc(l)}">${Array.from({length:NSET[i]},(_,k)=>`<option ${o.set==k+1?'selected':''}>${k+1}</option>`).join('')}</select></td></tr>`}).join('')).join('');
 view.innerHTML=crumb()+`<div class="row">${W('fa-users','s-pr',students.length,'Tổng học viên')}${W('fa-file-signature','s-in',ex.length,'Đã có bài thi')}${W('fa-check-circle','s-ok',pass,'Đạt (≥ 5)')}${W('fa-hourglass-half','s-wa',notYet.length,'Chưa thi')}</div>
 <div class="row"><div class="col-lg-5"><div class="card"><div class="card-header">Điểm TB theo đối tượng · ${avg}</div><div class="card-body"><canvas id="ch" height="200" aria-label="Biểu đồ điểm trung bình theo đối tượng" role="img"></canvas></div></div></div>
 <div class="col-lg-7"><div class="card"><div class="card-header">Mở thi và chọn đề</div><div class="ov"><table class="tbl cards"><thead><tr><th>Đối tượng</th><th>Mục thi</th><th>Mở</th><th>Đề số</th></tr></thead><tbody>${rows}</tbody></table></div><div class="card-body text-muted">Điểm: đúng 65% số câu → 5 điểm; phần còn lại chia đều đến 10.</div></div></div></div>
 <div class="card"><div class="card-header">Kết quả thi <span class="badge badge-pill bg-ok">${results.length}</span><span class="d-flex no-print" style="gap:6px"><button class="btn btn-soft btn-sm" data-x="0">Xuất Excel</button><button class="btn btn-soft btn-sm" onclick="print()">In</button></span></div><div class="ov"><table class="tbl cards"><thead><tr><th>Học viên</th><th>Mục</th><th>Đề</th><th>Điểm</th><th></th></tr></thead><tbody>${results.map((r,i)=>[r,i]).slice(-30).reverse().map(([r,i])=>`<tr><td data-l="Học viên"><span class="av-sm">${esc(initials(r.n))}</span>${esc(r.n)}</td><td data-l="Mục">${esc(r.t)}${r.ph&&r.t==='Cử nhân PHCN'?' · '+esc(r.ph):''}</td><td data-l="Đề">${r.set||'—'}</td><td data-l="Điểm"><span class="badge badge-pill ${+r.sc>=5?'bg-ok':'bg-mut'}">${r.sc??'—'}</span>${r.tot?` (${r.ok}/${r.tot})`:''}</td><td class="no-print"><button class="btn btn-soft btn-sm text-danger" data-del="${i}" aria-label="Xóa kết quả của ${esc(r.n)}"><i class="fas fa-trash"></i></button></td></tr>`).join('')||'<tr><td colspan=5 class="text-muted">Chưa có bài thi nào.</td></tr>'}</tbody></table></div></div>`;
 $('#lo').onclick=()=>{ADM='';try{sessionStorage.removeItem('vltl_adm')}catch(e){}toast('Đã thoát quản trị');location.hash='#/'};
 const save=()=>OK&&api({action:'setConfig'},{pin:ADM,open}).then(r=>r.ok?toast('Đã lưu cấu hình thi lên máy chủ'):toast('Chưa lưu được: '+(r.error||'lỗi'),1)).catch(e=>toast('Chưa lưu được: '+e.message,1));
 $$('[data-i]',view).forEach(c=>c.onchange=()=>{const k=SUBJ[c.dataset.i]+'|'+c.dataset.l,o=open[k]||{on:false,set:1};open[k]={...o,on:c.checked};SV('open',open);save()});
 $$('[data-set]',view).forEach(s=>s.onchange=()=>{const k=s.dataset.set.replace('|','|'),[i,l]=k.split('|'),kk=SUBJ[i]+'|'+l,o=open[kk]||{on:false,set:1};open[kk]={...o,set:+s.value};SV('open',open);save()});
 $$('[data-del]',view).forEach(b=>b.onclick=async()=>{const ix=+b.dataset.del,r=results[ix];if(!await ask({title:'Xóa kết quả thi',msg:`Xóa kết quả của ${r.n} (${r.t}, ${r.sc}/10)? File trên Drive không bị xóa.`,ok:'Xóa'}))return;
  results.splice(ix,1);SV('res',results);toast('Đã xóa kết quả của '+r.n,0,()=>{results.splice(ix,0,r);SV('res',results);R.admin()});R.admin()});
 $('[data-x]',view).onclick=()=>{const H=['STT','Họ tên','Ngày sinh','Đối tượng','Giai đoạn','Bộ đề','Từ ngày','Đến ngày','Số câu đúng','Tổng số câu','Điểm','Thời điểm nộp'],ws=XLSX.utils.aoa_to_sheet([H,...results.map((r,i)=>[i+1,r.n,r.d,r.t,r.ph,r.set,r.from,r.to,r.ok,r.tot,r.sc,r.at])]),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'KetQuaThi');XLSX.writeFile(wb,'ket_qua_thi_VLTL.xlsx')};
 const g=[0,1,2].map(i=>{const L=ex.filter(r=>r.t===SUBJ[i]);return L.length?+(L.reduce((a,r)=>a+(+r.sc||0),0)/L.length).toFixed(1):0});
 if(window.Chart)new Chart($('#ch'),{type:'bar',data:{labels:SUBJ.slice(0,3),datasets:[{data:g,backgroundColor:['#3f6ad8','#3ac47d','#f7b924'],borderRadius:4}]},options:{plugins:{legend:{display:false}},scales:{y:{min:0,max:10}}}})};

/* ===== Router (hash) — #/doituong/1, #/thi/1/0 … ===== */
function showErr(e){console.error(e);view.innerHTML=`<div class="alert alert-danger"><b>Lỗi hiển thị:</b> ${esc(e&&e.message||e)}<br><small>Nhấn Ctrl+F5 để tải lại. Nếu vẫn lỗi, chụp dòng này gửi người phát triển.</small></div>`}
function route(){const h=location.hash.replace(/^#\/?/,''),[path,qs]=h.split('?'),[p,a,b]=path.split('/'),n=v=>v===undefined?0:+v;
 const m={'':()=>R.home(),noiquy:()=>R.rules(),phanphong:()=>R.rooms(),doituong:()=>R.subj(n(a)),kythuat:()=>R.tech(n(a),0,qs&&decodeURIComponent(qs.replace(/^q=/,''))),bangkiem:()=>R.bk(n(a)),ontap:()=>R.rev(n(a)),thi:()=>R.exam(n(a),n(b)),quantri:()=>R.admin()};
 clearInterval(S.tm);document.body.classList.remove('open');window.scrollTo(0,0);
 $$('#menu a').forEach(x=>x.classList.toggle('on',x.dataset.h==='#/'+(p==='doituong'?'doituong/'+a:p)));
 try{Promise.resolve((m[p]||m[''])()).catch(showErr)}catch(e){showErr(e)}view.focus({preventScroll:true})}
addEventListener('hashchange',route);

/* ===== Khởi động: skeleton → tải dữ liệu → hiển thị ===== */
route();
pull().catch(()=>{}).finally(()=>{if(!S.tm&&!/^#\/(thi|quantri)/.test(location.hash))route();flush();$('#bellDot').hidden=!pendingCount()});
setInterval(()=>{if(document.visibilityState==='visible'&&OK&&!S.tm&&/^#\/(doituong|phanphong)/.test(location.hash))pull().then(route)},30000);
})();
