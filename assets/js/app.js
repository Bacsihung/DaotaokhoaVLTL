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
let STF='';try{STF=sessionStorage.getItem('vltl_stf')||''}catch(e){}
const ICON={home:'fa-home',rules:'fa-book',rooms:'fa-th-large',user:'fa-user-md',admin:'fa-lock',file:'fa-file-alt',chart:'fa-chart-pie',check:'fa-user-check'};

/* ===== API (giữ nguyên giao thức Apps Script) ===== */
async function api(p,body){const c=new AbortController(),t=setTimeout(()=>c.abort(),20000);
 try{const u=API+'?'+new URLSearchParams({token:TOKEN,origin:location.origin,_t:Date.now(),...p});
  const r=await fetch(u,{cache:'no-store',signal:c.signal,...(body?{method:'POST',body:JSON.stringify(body)}:{})});return await r.json()}finally{clearTimeout(t)}}
async function pull(){if(!OK)return;
 const [c,t]=await Promise.allSettled([api({action:'config'}),api({action:'tree'})]);
 if(c.status==='fulfilled'&&!c.value.error){const v=c.value;open=v.open||{};const mm=v.meta||{};META=mm.meta||{};REMOVED=mm.removed||[];EXTRA=mm.extra||[];if(v.students?.length&&!STU_SRC)STU_RAW=v.students;students=STU_RAW.concat(EXTRA).filter(x=>REMOVED.indexOf(skey(x))<0);if(v.rooms2&&Date.now()>RM_LOCK)ROOMS2=v.rooms2;SV('open',open);mergeNotifs(v.notifs);ERR=''}
 else ERR=String(c.reason?.message||c.value?.error||'lỗi kết nối');
 if(t.status==='fulfilled'&&t.value.files){FILES=t.value.files;await loadStudents()}}

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
const crumb=(extra='',right='')=>`<div class="mb-3 no-print d-flex flex-wrap" style="gap:8px"><button class="btn btn-soft" onclick="history.back()" aria-label="Quay lại"><i class="fas fa-arrow-left"></i> Quay lại</button><a class="btn btn-soft" href="#/">Trang chủ</a>${extra}${right?`<div class="ml-auto d-flex" style="gap:8px">${right}</div>`:''}</div>`;

/* ===== Menu / điều hướng ===== */
const MENU=[['h','Menu chính'],['#/','Trang chủ','home'],['#/noiquy','Nội quy','rules'],['#/phanphong','Danh sách phân phòng','rooms'],['#/diemdanh','Điểm danh','check'],
 ['h','Đối tượng thực hành'],...SUBJ.map((s,i)=>['#/doituong/'+i,s,'user']),['h','Quản trị'],['#/quantri','Quản trị viên','admin']];
const ADM_SUB=[['tong-quan','Tổng quan','fa-chart-pie'],['mo-thi','Mở thi và chọn đề','fa-door-open'],['vong-quay','Vòng quay bảng kiểm','fa-dice'],['ket-qua','Kết quả thi','fa-file-signature'],['hoc-vien','Danh sách học viên','fa-users'],['nhat-ky','Nhật ký thao tác','fa-history']];
function buildMenu(){$('#menu').innerHTML=MENU.map(m=>m[0]==='h'?`<h6>${m[1]}</h6>`:`<a href="${m[0]}" data-h="${m[0]}"><i class="fas ${ICON[m[2]]}" aria-hidden="true"></i><span>${m[1]}</span></a>`).join('')+(ADM?ADM_SUB.map(x=>`<a class="sub" href="#/quantri/${x[0]}" data-h="#/quantri/${x[0]}"><i class="fas ${x[2]}" aria-hidden="true"></i><span>${x[1]}</span></a>`).join(''):'')}
buildMenu();
try{new PerfectScrollbar('#menu')}catch(e){}
$('#btnSb').onclick=()=>innerWidth>991?document.body.classList.toggle('mini'):document.body.classList.toggle('open');
$('#sbMask').onclick=()=>document.body.classList.remove('open');
$('#btnTheme').onclick=()=>{const t=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=t;try{localStorage.setItem('vltl_theme',t)}catch(e){}};
$('#btnAdm').onclick=()=>{location.hash='#/quantri'};
$('#btnBell').onclick=()=>openBell();

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
 <div class="row">${LEAD.map(l=>`<div class="col-md-6 col-xl-3"><div class="card lead-card"><div class="card-body"><small class="text-muted">${l[0]}</small><b>${l[1]}</b></div></div></div>`).join('')}</div>
 <div class="row"><div class="col-md-6"><a class="card link" href="#/noiquy" style="text-decoration:none"><div class="card-body"><h5><i class="fas fa-book text-primary"></i> Nội quy</h5><span class="text-muted">Học viên bắt buộc tuân thủ nội quy; xem đơn xin nghỉ phép.</span></div></a></div>
 <div class="col-md-6"><a class="card link" href="#/phanphong" style="text-decoration:none"><div class="card-body"><h5><i class="fas fa-th-large text-primary"></i> Danh sách phân phòng</h5><span class="text-muted">Sơ đồ phòng thực hành theo ca.</span></div></a></div></div>
 <div class="card"><div class="card-header">Đối tượng thực hành</div><div class="card-body"><div class="row">${SUBJ.map((s,i)=>`<div class="col-6 col-xl-3 mb-2"><a class="btn btn-soft btn-block py-3" href="#/doituong/${i}"><i class="fas fa-user-md"></i> ${s}</a></div>`).join('')}</div></div></div>`};

/* ===== Nội quy ===== */
R.rules=()=>{head('fa-book','Nội quy','Nội quy và đơn xin nghỉ phép của Khoa');
 const fl=kw=>findAny(kw).map(f=>`<div class="d-flex align-items-center py-2 border-bottom" style="gap:10px"><i class="fas fa-file-pdf text-danger"></i><span class="flex-fill">${esc(f.name.replace(/\.[a-z0-9]+$/i,'').replace(/_/g,' '))}</span><button class="btn btn-soft btn-sm" data-id="${f.id}" data-n="${esc(f.name)}">Xem</button><a class="btn btn-soft btn-sm" target="_blank" rel="noopener" href="https://drive.google.com/uc?export=download&id=${f.id}">Tải về</a></div>`).join('')||'<p class="text-muted mb-0">Chưa có file trên Drive.</p>';
 view.innerHTML=crumb()+`<div class="alert alert-primary">Các học viên bắt buộc tuân thủ đúng các nội quy của Khoa.</div><div class="row"><div class="col-lg-6"><div class="card"><div class="card-header">Nội quy của Khoa</div><div class="card-body">${fl('noi quy')}</div></div></div><div class="col-lg-6"><div class="card"><div class="card-header">Đơn xin nghỉ phép</div><div class="card-body">${fl('nghi phep')}</div></div></div></div>`;
 $$('[data-id]',view).forEach(b=>b.onclick=()=>openDrive(b.dataset.id,b.dataset.n))};

/* ===== Trang đối tượng ===== */
R.subj=i=>{const s=SUBJ[i];head('fa-user-md',s,'Danh mục kỹ thuật, bảng kiểm, ôn tập và thi');
 const W=(h,ic,cls,n,l)=>`<div class="col-md-4"><a class="card widget link" href="${h}" style="text-decoration:none"><div class="wi ${cls}"><i class="fas ${ic}"></i></div><div><div class="wn">${n}</div><div class="wl">${l}</div></div></a></div>`;
 const ex=(LB[i]||[]).map((l,li)=>{const o=open[s+'|'+l],ok=o&&o.on;return `<div class="col-md-6"><div class="card ${ok?'link':''}" style="${ok?'':'opacity:.7'}" ${ok?`data-ex="${li}"`:''}><div class="card-body d-flex align-items-center" style="gap:12px"><div class="wi ${ok?'s-ok':'s-no'}"><i class="fas ${ok?'fa-pen':'fa-lock'}"></i></div><div><b>${esc(l)}</b><div class="text-muted">${ok?'Đã mở – Đề số '+o.set+' – nhấn để vào thi':ERR?'Lỗi kết nối máy chủ (F5 để thử lại)':'Chờ Quản trị viên mở'}</div></div></div></div></div>`}).join('')||'<div class="col-12"><div class="card"><div class="card-body text-muted">Chưa có bộ đề cho nhóm này.</div></div></div>';
 view.innerHTML=crumb()+`<div class="row">${W('#/kythuat/'+i,'fa-list','s-pr',TECH[i].length,'Kỹ thuật trong danh mục')}${W('#/bangkiem/'+i,'fa-clipboard-check','s-ok',bkFiles(i).length||8,'Bảng kiểm quy trình')}${W('#/ontap/'+i,'fa-question-circle','s-wa',KEYS[i].length*5,'Câu hỏi ôn tập')}</div><h6 class="text-muted mb-3">THI KẾT THÚC THỰC HÀNH</h6><div class="row">${ex}</div>`;
 $$('[data-ex]',view).forEach(c=>c.onclick=()=>location.hash='#/thi/'+i+'/'+c.dataset.ex);wheelMount(i)};

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
 results.push(r);SV('res',results);audit('Nộp bài thi ('+r.t+', đề '+r.set+'): '+r.sc+'/10',r.n);
 view.innerHTML=`<div class="card" style="max-width:520px;margin:0 auto;text-align:center"><div class="card-header">Kết quả bài thi</div><div class="card-body"><div class="big">${sc}<small style="font-size:18px">/10</small></div><p>Số câu đúng: <b>${ok}/${tot}</b></p><div class="progress"><div class="progress-bar" style="width:${ok/tot*100}%"></div></div><p id="svst" class="text-muted mt-3">${OK?'Đang lưu bài làm lên Google Drive…':''}</p><a class="btn btn-primary" href="#/">Về trang chủ</a> <button class="btn btn-soft" id="dlp">Tải đề thi (Quản trị viên)</button></div></div>`;$('#dlp').onclick=()=>dlPin(results.length-1);
 if(!OK)return;try{const x=await api({action:'result'},{r:{...r,qs:undefined,ans:undefined},html:`<p>${esc(r.n)} — ${r.sc}/10 (${r.ok}/${r.tot})</p>`});if(x.error)throw new Error(x.error);$('#svst').textContent='Đã lưu bài làm và điểm lên Google Drive.';toast('Đã lưu kết quả lên Drive')}
 catch(e){const p=LS('vltl_pending_results',[]);p.push({r,at:Date.now()});SV('vltl_pending_results',p);$('#bellDot').hidden=false;$('#svst').textContent='Chưa gửi được lên Drive; đã lưu trên máy, sẽ thử lại.';toast('Chưa gửi được lên Drive. Đã lưu máy, sẽ thử lại sau.',1)}}
async function flush(){const q=LS('vltl_pending_results',[]);if(!q.length||!OK)return;const left=[];for(const it of q){try{const x=await api({action:'result'},{r:{...it.r,qs:undefined,ans:undefined},html:''});if(x.error)left.push(it)}catch(e){left.push(it)}}SV('vltl_pending_results',left);bellUpdate();if(left.length<q.length)toast('Đã đồng bộ '+(q.length-left.length)+' kết quả thi')}
addEventListener('online',flush);

/* ===== Quản trị ===== */
async function login(){const p=await ask({title:'Quản trị viên',msg:'Nhập mật khẩu để vào trang quản trị.',input:'password',ok:'Đăng nhập'});if(!p)return false;
 if(!OK){toast('Chưa cấu hình kết nối Google Drive (API)',1);return false}
 try{const r=await api({action:'auth'},{pin:p});if(r&&r.ok){ADM=p;try{sessionStorage.setItem('vltl_adm',p)}catch(e){}toast('Đã đăng nhập quản trị');buildMenu();audit('Đăng nhập quản trị');bellUpdate();return true}audit('Đăng nhập quản trị thất bại','Không xác định');toast('Sai mật khẩu',1)}catch(e){toast('Không kết nối được máy chủ',1)}return false}
/* ===== Thông báo (chuông): nghỉ phép của học viên → Quản trị viên ===== */
const NOTIF='vltl_notif',NREAD='vltl_notif_read';
function notify(msg,id,t){const L=LS(NOTIF,[]);id=String(id||('n'+Date.now()));if(L.some(x=>x.id===id))return false;L.push({id,t:t||new Date().toLocaleString('vi-VN'),msg:String(msg)});SV(NOTIF,L.slice(-100));bellUpdate();return true}
window.VLTL_notify=notify;
const unreadN=()=>{const r=LS(NREAD,[]);return LS(NOTIF,[]).filter(x=>r.indexOf(x.id)<0)};
function bellUpdate(){const d=$('#bellDot');if(d)d.hidden=!(pendingCount()||(ADM&&unreadN().length))}
function mergeNotifs(a){if(!Array.isArray(a))return;a.forEach(n=>{if(n&&notify(n.msg||n.text||'',n.id||n.t,n.t)&&ADM)toast('🔔 '+(n.msg||n.text||'Có thông báo mới'))})}
function openBell(){const un=unreadN().map(x=>x.id),L=ADM?LS(NOTIF,[]).slice().reverse().slice(0,30):[],p=pendingCount();
 const m=modal(`<h5>Thông báo</h5>${p?`<div class="alert alert-warning">${p} bài thi chưa đồng bộ lên Drive.</div>`:''}${ADM?(L.length?L.map(x=>`<div class="py-2 border-bottom"><div class="${un.indexOf(x.id)>=0?'font-weight-bold':''}">${esc(x.msg)}</div><small class="text-muted">${esc(x.t)}</small></div>`).join(''):'<p class="text-muted">Chưa có thông báo nghỉ phép nào.</p>'):'<p class="text-muted">Thông báo xin nghỉ phép của học viên chỉ hiển thị cho Quản trị viên.</p>'}<button class="btn btn-soft mt-3" id="nc">Đóng</button>`);
 $('#nc',m).onclick=()=>m.remove();if(ADM&&L.length){SV(NREAD,LS(NOTIF,[]).map(x=>x.id));bellUpdate()}}
setInterval(()=>{if(ADM&&OK&&document.visibilityState==='visible')api({action:'config'}).then(v=>mergeNotifs(v&&v.notifs)).catch(()=>{})},60000);
const HIDE_SEC=['hoc-vien','nhat-ky'];
function toggleSec(id){const el=document.getElementById('ad-'+id);if(!el)return;el.hidden=!el.hidden;if(!el.hidden)el.scrollIntoView({behavior:'smooth',block:'start'})}
/* ===== Nhật ký thao tác (ai, làm gì, lúc nào) ===== */
document.head.insertAdjacentHTML('beforeend','<style>.ad-sec{scroll-margin-top:84px}.sb-scroll a.sub{height:36px;padding-left:34px;font-size:13px}</style>');
const AUD='vltl_audit',ADMIN_WHO='Quản trị viên (BS.CKI Trần Cồng Hùng)';
function audit(what,who){const e={t:new Date().toLocaleString('vi-VN'),w:who||(ADM?ADMIN_WHO:STF?'Nhân viên khoa':'Học viên'),a:what},L=LS(AUD,[]);L.push(e);SV(AUD,L.slice(-500));if(OK)api({action:'audit'},{entry:e}).catch(()=>{})}
const scrollSec=id=>{const el=document.getElementById('ad-'+id);if(!el)return;if(el.hidden)el.hidden=false;el.scrollIntoView({behavior:'smooth',block:'start'})};
$('#menu').addEventListener('click',e=>{const a=e.target.closest('a.sub');if(a&&location.hash===a.dataset.h){e.preventDefault();const id=a.dataset.h.split('/').pop();HIDE_SEC.includes(id)?toggleSec(id):scrollSec(id);document.body.classList.remove('open')}});
/* ===== Quản trị viên: Tổng quan → Mở thi → Vòng quay → Kết quả → Học viên → Nhật ký ===== */
function editLeave(k){const x=sbyk(k);if(!x)return;const mt=META[k]||{},ld=a=>(a||[]).map(l=>typeof l==='string'?l:l.d).join(', ');
 const m=modal(`<h5>Nghỉ / bù – ${esc(x.n)}</h5><label>Ngày nghỉ (dd/mm/yyyy, cách nhau dấu phẩy)</label><input class="form-control" id="lv" value="${esc(ld(mt.leaves))}"><label class="mt-2">Ngày bù</label><input class="form-control" id="mu" value="${esc(ld(mt.makeup))}"><div class="d-flex mt-3" style="gap:8px"><button class="btn btn-primary" id="ls">Lưu</button><button class="btn btn-soft ml-auto" id="lc">Đóng</button></div>`);
 $('#lc',m).onclick=()=>m.remove();
 $('#ls',m).onclick=()=>{const P=v=>v.split(/[,;]+/).map(t=>t.trim()).filter(Boolean),a=P($('#lv',m).value),b=P($('#mu',m).value);
  if([...a,...b].some(d=>!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(d)))return toast('Ngày phải theo dạng dd/mm/yyyy',1);
  const keep=(old,L)=>L.map(d=>(old||[]).find(l=>l&&l.d===d)||d);
  META[k]={...META[k],leaves:keep(mt.leaves,a),makeup:keep(mt.makeup,b)};saveMeta();audit('Cập nhật ngày nghỉ/bù của '+x.n+' (nghỉ '+a.length+', bù '+b.length+')');m.remove();R.admin('hoc-vien')}}
R.admin=async sec=>{if(!ADM&&!(await login()))return location.hash='#/';
 head('fa-lock','Quản trị','Tổng quan, mở thi, vòng quay, kết quả, học viên');buildMenu();
 const ex=results.filter(r=>r.type!=='wheel'),pass=ex.filter(r=>+r.sc>=5).length,done=new Set(ex.map(r=>norm(r.n))),notYet=students.filter(s=>!done.has(norm(s.n)));
 const W=(ic,c,n,l)=>`<div class="col-6 col-xl-3"><div class="card widget"><div class="wi ${c}"><i class="fas ${ic}"></i></div><div><div class="wn">${n}</div><div class="wl">${l}</div></div></div></div>`,th=a=>`<thead><tr>${a.map(x=>`<th>${x}</th>`).join('')}</tr></thead>`,
 sw=(id,attr,on,lab)=>`<div class="custom-control custom-switch"><input type="checkbox" class="custom-control-input" id="${id}" ${attr} ${on?'checked':''}><label class="custom-control-label" for="${id}"><span class="sr-only">${lab}</span></label></div>`;
 const oRows=[0,1,2].map(i=>LB[i].map((l,li)=>{const o=open[SUBJ[i]+'|'+l]||{on:false,set:1};return `<tr><td data-l="Đối tượng">${SUBJ[i]}</td><td data-l="Mục thi">${esc(l)}</td><td data-l="Mở">${sw('sw'+i+li,`data-i="${i}" data-l="${esc(l)}"`,o.on,'Mở '+SUBJ[i]+' '+esc(l))}</td><td data-l="Đề số"><select class="form-control form-control-sm" data-set="${i}|${esc(l)}">${Array.from({length:NSET[i]},(_,k)=>`<option ${o.set==k+1?'selected':''}>${k+1}</option>`).join('')}</select></td></tr>`}).join('')).join('');
 const wRows=[0,1,2].map(i=>`<tr><td data-l="Đối tượng">${SUBJ[i]}</td><td data-l="Số ô">Quay ${WHEEL_N[i]} ô số bảng kiểm</td><td data-l="Bật">${sw('wh'+i,`data-w="${i}"`,wheelOn(i),'Bật vòng quay '+SUBJ[i])}</td></tr>`).join('');
 const ld=a=>(a||[]).map(l=>typeof l==='string'?l:l.d);
 const sRows=students.map((s,i)=>{const k=skey(s),mt=META[k]||{},lv=ld(mt.leaves),mu=ld(mt.makeup);return `<tr><td data-l="STT">${i+1}</td><td data-l="Họ tên"><span class="av-sm">${esc(initials(s.n))}</span>${esc(s.n)}</td><td data-l="Chức danh">${esc(s.t||'—')}</td><td data-l="Thời gian TH">${esc(s.tg||((s.from||'—')+' → '+(s.to||'—')))}</td><td data-l="Tổng ngày nghỉ"><b>${lv.length}</b></td><td data-l="Ngày nghỉ">${esc(lv.join(', ')||'—')}</td><td data-l="Ngày bù">${esc(mu.join(', ')||'—')}</td><td class="no-print"><button class="btn btn-soft btn-sm" data-lv="${esc(k)}" aria-label="Sửa ngày nghỉ, ngày bù của ${esc(s.n)}"><i class="fas fa-pen"></i></button></td></tr>`}).join('');
 const SHEET='https://docs.google.com/spreadsheets/d/10BKtykiTg_3df4r4rL-Lg9bLwz5r3Tka/edit?gid=565591906#gid=565591906',nq=findAny('noi quy'),dn=findAny('nghi phep'),lg=LS(AUD,[]).slice(-100).reverse();
 view.innerHTML=crumb('',`<button class="btn btn-soft" id="lo"><i class="fas fa-sign-out-alt"></i> Thoát quản trị</button><button class="btn btn-primary" id="aiopen" aria-expanded="false"><i class="fas fa-robot"></i> Trợ lý AI</button>`)+`<div class="card" id="aipanel" hidden><div class="card-header">Trợ lý AI – mở / đóng thi <span class="badge badge-pill bg-ok">Gemini</span></div><div class="card-body"><p class="text-muted">Ví dụ: “Mở PRETEST cho Cử nhân đề 3, đóng thi của Bác sĩ”. Trợ lý chỉ đề xuất; bạn bấm Áp dụng mới có hiệu lực. Không nhập họ tên hay ngày sinh.</p><textarea id="aiq" rows="2" class="form-control mb-2" placeholder="Nhập yêu cầu…"></textarea><button class="btn btn-primary" id="aib">Hỏi trợ lý</button><div id="aio" class="mt-3"></div></div></div><section class="ad-sec" id="ad-tong-quan"><div class="row">${W('fa-users','s-pr',students.length,'Tổng học viên')}${W('fa-file-signature','s-in',ex.length,'Đã có bài thi')}${W('fa-check-circle','s-ok',pass,'Đạt (≥ 5 điểm)')}${W('fa-hourglass-half','s-wa',notYet.length,'Chưa thi')}</div><div class="mb-3 no-print d-flex flex-wrap" style="gap:8px"><button class="btn btn-soft" data-tg="hoc-vien"><i class="fas fa-users"></i> Danh sách học viên</button><button class="btn btn-soft" data-tg="nhat-ky"><i class="fas fa-history"></i> Nhật ký thao tác</button></div></section>
 <section class="ad-sec" id="ad-mo-thi"><div class="card"><div class="card-header">Mở thi và chọn đề</div><div class="ov"><table class="tbl cards">${th(['Đối tượng','Mục thi','Mở','Đề số'])}<tbody>${oRows}</tbody></table></div><div class="card-body text-muted">Cách tính điểm: đúng 65% số câu → 5 điểm; phần còn lại chia đều đến 10.</div></div></section>
 <section class="ad-sec" id="ad-vong-quay"><div class="card"><div class="card-header">Vòng quay bảng kiểm QTKT – bật / tắt</div><div class="ov"><table class="tbl cards">${th(['Đối tượng','Số ô','Bật'])}<tbody>${wRows}</tbody></table></div><div class="card-body text-muted">Khi bật, học viên vào trang đối tượng sẽ thấy các ô quay số.</div></div></section>
 <section class="ad-sec" id="ad-ket-qua"><div class="card"><div class="card-header">Kết quả thi <span class="badge badge-pill bg-ok">${results.length}</span><span class="d-flex flex-wrap no-print" style="gap:6px"><button class="btn btn-soft btn-sm" data-x="0">Xuất Excel</button><button class="btn btn-soft btn-sm" data-xe="Bác sĩ">Mẫu Bác sĩ</button><button class="btn btn-soft btn-sm" data-xe="Cử nhân PHCN">Mẫu Cử nhân</button><button class="btn btn-soft btn-sm" data-xe="Y sĩ">Mẫu Y sĩ</button><button class="btn btn-soft btn-sm" onclick="print()">In</button></span></div><div class="ov"><table class="tbl cards">${th(['Học viên','Mục','Đề','Điểm',''])}<tbody>${results.map((r,i)=>[r,i]).slice(-30).reverse().map(([r,i])=>`<tr><td data-l="Học viên"><span class="av-sm">${esc(initials(r.n))}</span>${esc(r.n)}</td><td data-l="Mục">${esc(r.t)}${r.ph&&r.t==='Cử nhân PHCN'?' · '+esc(r.ph):''}</td><td data-l="Đề">${r.set||'—'}</td><td data-l="Điểm"><span class="badge badge-pill ${+r.sc>=5?'bg-ok':'bg-mut'}">${r.sc??'—'}</span>${r.tot?` (${r.ok}/${r.tot})`:''}</td><td class="no-print">${r.qs?`<button class="btn btn-soft btn-sm" data-dl="${i}">Tải đề</button> `:''}<button class="btn btn-soft btn-sm text-danger" data-del="${i}" aria-label="Xóa kết quả của ${esc(r.n)}"><i class="fas fa-trash"></i></button></td></tr>`).join('')||'<tr><td colspan="5" class="text-muted">Chưa có bài thi nào.</td></tr>'}</tbody></table></div></div></section>
 <section class="ad-sec" id="ad-hoc-vien" hidden><div class="card"><div class="card-header">Danh sách học viên <span class="badge badge-pill bg-ok">${students.length}</span></div><div class="card-body pb-0"><p class="text-muted mb-2">Nguồn: ${STU_SRC?esc(STU_SRC):(STU_ERR?'lỗi: '+esc(STU_ERR):'dữ liệu máy chủ'+(OK?'':' (chưa kết nối)'))} · <a href="${SHEET}" target="_blank" rel="noopener">Mở Google Sheet DS học viên</a></p><details class="no-print"><summary class="text-muted" style="cursor:pointer">Nhập thêm từ Excel (tùy chọn)</summary><p class="text-muted mt-2">Cột: Họ tên | Ngày sinh | Từ ngày | Đến ngày | Phòng | Đối tượng</p><input type="file" id="imp" accept=".xlsx,.xls" aria-label="Chọn file Excel"></details></div><div class="ov"><table class="tbl cards">${th(['STT','Họ tên','Chức danh','Thời gian TH','Tổng ngày nghỉ','Ngày nghỉ (cụ thể)','Ngày bù',''])}<tbody>${sRows||'<tr><td colspan="8" class="text-muted">Chưa có học viên.</td></tr>'}</tbody></table></div></div></section>
 <section class="ad-sec" id="ad-nhat-ky" hidden><div class="card"><div class="card-header">Nhật ký thao tác <span class="d-flex no-print"><button class="btn btn-soft btn-sm" id="lgx">Xuất Excel</button></span></div><div class="ov" style="max-height:420px;overflow:auto"><table class="tbl cards">${th(['Thời gian','Ai','Làm gì'])}<tbody>${lg.map(e=>`<tr><td data-l="Thời gian">${esc(e.t)}</td><td data-l="Ai">${esc(e.w)}</td><td data-l="Làm gì">${esc(e.a)}</td></tr>`).join('')||'<tr><td colspan="3" class="text-muted">Chưa có thao tác nào.</td></tr>'}</tbody></table></div><div class="card-body text-muted">Hiển thị 100 thao tác gần nhất (lưu tối đa 500 trên trình duyệt này${OK?'; đồng thời gửi lên máy chủ nếu Apps Script hỗ trợ action “audit”':''}).</div></div></section>
 <section class="ad-sec"><div class="card"><div class="card-header">Kiểm tra dữ liệu Google Drive <span class="badge badge-pill bg-ok">${FILES.length} file</span></div><div class="ov"><table class="tbl">${th(['Đối tượng','PDF QTKT','File bảng kiểm'])}<tbody>${SUBJ.map((s,i)=>`<tr><td>${s}</td><td>${subjFiles(i,'qtkt').length}</td><td>${subjFiles(i,'bang kiem',false).length}</td></tr>`).join('')}</tbody></table></div><div class="card-body"><p class="text-muted">Nội quy: ${nq.length?esc(nq[0].name):'chưa thấy'} · Đơn xin nghỉ phép: ${dn.length?esc(dn[0].name):'chưa thấy'}</p><button class="btn btn-soft" id="rl">Tải lại dữ liệu Drive</button></div></div></section>`;
 const save=()=>OK&&api({action:'setConfig'},{pin:ADM,open}).then(r=>r.ok?toast('Đã lưu cấu hình thi lên máy chủ'):toast('Chưa lưu được: '+(r.error||'lỗi'),1)).catch(e=>toast('Chưa lưu được: '+e.message,1));
 $$('[data-i]',view).forEach(c=>c.onchange=()=>{const k=SUBJ[c.dataset.i]+'|'+c.dataset.l,o=open[k]||{on:false,set:1};open[k]={...o,on:c.checked};SV('open',open);audit((c.checked?'Mở':'Đóng')+' thi: '+SUBJ[c.dataset.i]+' – '+c.dataset.l);save()});
 $$('[data-set]',view).forEach(s=>s.onchange=()=>{const [i,l]=s.dataset.set.split('|'),kk=SUBJ[i]+'|'+l,o=open[kk]||{on:false,set:1};open[kk]={...o,set:+s.value};SV('open',open);audit('Chọn đề số '+s.value+' cho '+SUBJ[i]+' – '+l);save()});
 $$('[data-w]',view).forEach(c=>c.onchange=()=>{open['wheel|'+SUBJ[c.dataset.w]]={on:c.checked};SV('open',open);audit((c.checked?'Bật':'Tắt')+' vòng quay bảng kiểm: '+SUBJ[c.dataset.w]);save()});
 $$('[data-del]',view).forEach(b=>b.onclick=async()=>{const ix=+b.dataset.del,r=results[ix];if(!await ask({title:'Xóa kết quả thi',msg:`Xóa kết quả của ${r.n} (${r.t}, ${r.sc}/10)? File trên Drive không bị xóa.`,ok:'Xóa'}))return;results.splice(ix,1);SV('res',results);audit('Xóa kết quả thi của '+r.n+' ('+r.t+', '+r.sc+'/10)');toast('Đã xóa kết quả của '+r.n,0,()=>{results.splice(ix,0,r);SV('res',results);audit('Hoàn tác xóa kết quả thi của '+r.n);R.admin('ket-qua')});R.admin('ket-qua')});
 $$('[data-dl]',view).forEach(b=>b.onclick=()=>dlr(+b.dataset.dl));$$('[data-xe]',view).forEach(b=>b.onclick=()=>expEnd(b.dataset.xe));$$('[data-lv]',view).forEach(b=>b.onclick=()=>editLeave(b.dataset.lv));
 $('[data-x]',view).onclick=()=>{const H=['STT','Họ tên','Ngày sinh','Đối tượng','Giai đoạn','Bộ đề','Từ ngày','Đến ngày','Số câu đúng','Tổng số câu','Điểm','Thời điểm nộp'],ws=XLSX.utils.aoa_to_sheet([H,...results.map((r,i)=>[i+1,r.n,r.d,r.t,r.ph,r.set,r.from,r.to,r.ok,r.tot,r.sc,r.at])]),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'KetQuaThi');XLSX.writeFile(wb,'ket_qua_thi_VLTL.xlsx');audit('Xuất Excel toàn bộ kết quả thi')};
 $('#lgx').onclick=()=>{const ws=XLSX.utils.aoa_to_sheet([['Thời gian','Ai','Làm gì'],...LS(AUD,[]).slice().reverse().map(e=>[e.t,e.w,e.a])]),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'NhatKy');XLSX.writeFile(wb,'nhat_ky_thao_tac_VLTL.xlsx');audit('Xuất nhật ký thao tác')};
 $('#rl').onclick=()=>pull().then(()=>{toast('Đã tải lại dữ liệu Drive');R.admin()});
 $('#imp').onchange=e=>{const f=e.target.files[0];if(!f||typeof XLSX==='undefined')return;f.arrayBuffer().then(b=>{const wb=XLSX.read(b),rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,raw:false}).slice(1).filter(r=>r[0]);STU_RAW=rows.map(r=>({n:r[0],d:r[1],from:r[2],to:r[3],room:r[4],t:r[5]}));SV('sv',STU_RAW);rebuildStu();if(OK)api({action:'saveStudents'},{pin:ADM,students:STU_RAW});audit('Nhập danh sách học viên từ Excel ('+rows.length+' dòng)');toast('Đã nhập '+rows.length+' dòng');R.admin('hoc-vien')})};
 $('#lo').onclick=()=>{audit('Thoát quản trị');ADM='';try{sessionStorage.removeItem('vltl_adm')}catch(e){}buildMenu();toast('Đã thoát quản trị');location.hash='#/'};
 $$('[data-tg]',view).forEach(b=>b.onclick=()=>toggleSec(b.dataset.tg));
 $('#aiopen').onclick=()=>{const p=$('#aipanel');p.hidden=!p.hidden;$('#aiopen').setAttribute('aria-expanded',String(!p.hidden));if(!p.hidden)$('#aiq').focus()};$('#aib').onclick=aiExam;
 if(sec)setTimeout(()=>scrollSec(sec),60)};

/* ===== Phân phòng: xem + kéo thả (quản trị) ===== */
document.head.insertAdjacentHTML('beforeend','<style>.chp.adm{cursor:grab;user-select:none;-webkit-user-select:none}.chp .st{color:#d92550}.dz{outline:2px dashed var(--pr);background:var(--soft)!important}body.dragging,body.dragging *{cursor:grabbing!important;user-select:none}.pool3{display:grid;gap:12px;grid-template-columns:repeat(3,minmax(0,1fr))}.pc{border:1px solid var(--bd);border-radius:8px;padding:8px;min-height:60px}.slots{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin:18px 0}.slot{width:110px;height:120px;border-radius:12px;background:var(--card);border:3px solid var(--pr);display:grid;place-items:center;font-size:56px;font-weight:700;color:var(--hd);box-shadow:inset 0 -8px 16px rgba(63,106,216,.12)}.slot.spin{color:var(--mut);filter:blur(1px)}.slot.hit{border-color:var(--ok);color:var(--ok);animation:pop .35s}@keyframes pop{50%{transform:scale(1.12)}}@media(max-width:760px){.pool3{grid-template-columns:1fr}}</style>');
const TABS={w:'Trong tuần',t7:'Thứ Bảy',cn:'Chủ Nhật'};
const RAI=[['201-202','P.201 - 202'],['204-206','P.204 - 206'],['207A','P.207A'],['207B','P.207B'],['208-209','P.208 - 209'],['6.216','P.6.216'],['6.215','P.6.215'],['6.214','P.6.214'],['6.213','P.6.213']];
let STU_RAW=students.slice(),META={},REMOVED=[],EXTRA=[],RM_LOCK=0,DRAG=null,SUP=0,AIR=null;
const skey=x=>x.n+'|'+(x.d||''),sbyk=k=>students.find(x=>skey(x)===k)||null,RMD=()=>ROOMS2=ROOMS2||{w:{},t7:{},cn:{}};
const fold=x=>String(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D');
const role=x=>{const t=nz(x&&x.t||'');return /bac si|^bs/.test(t)?'BS':/(^| )y si|^ys/.test(t)?'YS':'KTV'};
const placed=x=>Object.values((ROOMS2&&ROOMS2[TAB])||{}).some(L=>L.some(p=>p.k===skey(x)));
const legacy=id=>(SCH[TAB]?.[id]||'').split(',').filter(Boolean).map(x=>{const [n,note]=x.split('|');return{n,note:note||''}});
const chip=p=>{const r=/^BS\b/i.test(p.n)?'bs':/^YS\b/i.test(p.n)?'ys':'';return `<span class="chp ${r}" data-lg="${esc(p.n)}" tabindex="0">${esc(p.n)}${p.note?' · '+esc(p.note):''}</span>`};
const chipK=(p,rm,i)=>{const x=sbyk(p.k),mt=META[p.k]||{},lab=x?role(x)+' '+x.n.split(' ').slice(-2).join(' '):p.k.split('|')[0];return `<span class="chp ${x?role(x).toLowerCase():''} ${ADM?'adm':''}" data-k="${esc(p.k)}" data-room="${rm}" data-idx="${i}">${esc(lab)}${mt.star?'<b class="st">*</b>':''}${p.note?` <small>${esc(p.note)}</small>`:''}</span>`};
const chipPool=x=>{const k=skey(x),mt=META[k]||{};return `<span class="chp ${role(x).toLowerCase()} ${ADM?'adm':''}" data-k="${esc(k)}" data-room="">${esc(role(x)+' '+x.n.split(' ').slice(-2).join(' '))}${mt.star?'<b class="st">*</b>':''}</span>`};
const room=(id,t)=>{const srv=ROOMS2&&ROOMS2[TAB],L=srv?(srv[id]||[]):legacy(id);return `<div class="rm" data-drop="${id}" data-n="${nz(L.map(p=>p.n||p.k).join(' '))}"><h3>${t}<span>${L.length} học viên</span></h3>${(srv?L.map((p,i)=>chipK(p,id,i)):L.map(chip)).join('')||`<span class="text-muted">${ADM?'Kéo học viên vào đây':'Chưa có học viên'}</span>`}</div>`};
const aiRoomHTML=()=>`<div class="card no-print"><div class="card-header">Trợ lý AI – điều động học viên vào phòng <span class="badge badge-pill bg-ok">Gemini</span></div><div class="card-body"><p class="text-muted">Tên học viên được ẩn danh trước khi gửi AI. Ví dụ: “Xếp các bạn chưa phân phòng vào P.207A và P.208 - 209, mỗi phòng tối đa 8 người”.</p><textarea id="air" rows="2" class="form-control mb-2" placeholder="Nhập yêu cầu…"></textarea><button class="btn btn-primary" id="airb">Đề xuất phân phòng</button><div id="aiw" class="mt-3"></div></div></div>`;
R.rooms=()=>{if(ADM)RMD();head('fa-th-large','Danh sách phân phòng','Sơ đồ phòng và học viên theo từng ca',(ADM||STF?'<a class="btn btn-soft no-print" href="#/diemdanh"><i class="fas fa-user-check"></i> Điểm danh</a> ':'')+'<button class="btn btn-primary no-print" onclick="print()"><i class="fas fa-print"></i> In</button>');
 view.innerHTML=crumb()+(ADM?aiRoomHTML()+poolCard():'')+printHead('Danh sách phân phòng – '+TABS[TAB])+`<div class="card no-print"><div class="card-body d-flex flex-wrap" style="gap:8px">${Object.keys(TABS).map(k=>`<button class="btn ${k===TAB?'btn-primary':'btn-soft'}" data-t="${k}">${WL()[k]}</button>`).join('')}<input class="form-control ml-auto" style="max-width:240px" id="rf" placeholder="Lọc theo tên…" aria-label="Lọc học viên"></div><div class="card-body pt-0 text-muted">${ADM?'Quản trị: nhấn giữ tên rồi kéo vào phòng; bấm tên để sửa ghi chú, dấu *, bỏ khỏi phòng.':'Bấm tên học viên để xem thông tin.'}</div></div>
 <div class="card"><div class="card-header">Khu N4</div><div class="card-body"><div class="row"><div class="col-md-5">${room('201-202','P.201 - 202')}${room('208-209','P.208 - 209')}</div><div class="col-md-2"><div class="hall">HÀNH LANG</div></div><div class="col-md-5">${room('204-206','P.204 - 206')}${room('207A','P.207A')}${room('207B','P.207B')}</div></div></div></div>
 <div class="card"><div class="card-header">Khu N6</div><div class="card-body"><div class="row">${RAI.slice(5).map(r=>`<div class="col-md-6">${room(...r)}</div>`).join('')}</div></div></div>
 <div class="alert alert-warning">${esc(META._note||'Lưu ý: Các bạn có dấu * đúng 07h phải có mặt tại phòng được phân công. Lúc 11h đến 11h30 ở phòng 207A.')}${ADM?' <button class="btn btn-soft btn-sm ml-2 no-print" id="en">✎ Sửa</button>':''}</div>`;
 $$('[data-t]',view).forEach(b=>b.onclick=()=>{TAB=b.dataset.t;R.rooms()});
 $('#rf').oninput=e=>{const k=nz(e.target.value);$$('.rm',view).forEach(r=>r.style.display=!k||r.dataset.n.includes(k)?'':'none')};
 if(ADM){bindRoomAdmin();$('#airb').onclick=aiRooms;$('#en').onclick=async()=>{const t=await ask({title:'Sửa dòng Lưu ý',input:'text',ok:'Lưu'});if(t){META._note=t;saveMeta();audit('Sửa dòng Lưu ý trang phân phòng');R.rooms()}}}};
function saveRooms(){RM_LOCK=Date.now()+60000;if(!OK||!ADM)return toast('Đã giữ trên máy. Đăng nhập quản trị để lưu lên Drive.',1);
 Promise.all(['w','t7','cn'].map(d=>api({action:'saveRooms2'},{pin:ADM,day:d,rooms:(ROOMS2||{})[d]||{}}))).then(rs=>{const b=rs.find(r=>!r||!r.ok);if(b)toast('Chưa lưu lên Drive: '+(b.error||'lỗi'),1)}).catch(e=>toast('Chưa lưu lên Drive: '+e.message,1))}
const saveMeta=()=>OK&&ADM&&api({action:'saveMeta'},{pin:ADM,meta:META,removed:REMOVED,extra:EXTRA}).then(r=>{if(!r.ok)toast('Chưa lưu được: '+(r.error||'lỗi'),1)}).catch(e=>toast('Chưa lưu được: '+e.message,1));
function dropTo(d,to){const snap=JSON.stringify(ROOMS2),Rm=RMD();Rm[TAB]=Rm[TAB]||{};const src=d.from?Rm[TAB][d.from]:null;
 const i=src?(src[d.idx]&&src[d.idx].k===d.k?d.idx:src.findIndex(x=>x.k===d.k)):-1;
 if(to==='pool'){if(i>=0)src.splice(i,1);else return}
 else{if(d.from===to)return;const p=i>=0?src.splice(i,1)[0]:{k:d.k,note:''},dst=Rm[TAB][to]=Rm[TAB][to]||[];if(!dst.some(y=>y.k===p.k&&y.note===(p.note||'')))dst.push(p)}
 {const sx=sbyk(d.k);audit('Chuyển '+(sx?sx.n:d.k.split('|')[0])+' → '+(to==='pool'?'chưa phân phòng':'phòng '+to)+' ('+TABS[TAB]+')')}saveRooms();const y=scrollY;R.rooms();scrollTo(0,y);toast('Đã chuyển học viên',0,()=>{ROOMS2=JSON.parse(snap);saveRooms();R.rooms()})}
function startDrag(x,y){if(!DRAG||DRAG.on)return;DRAG.on=true;const g=DRAG.c.cloneNode(true);g.style.cssText='position:fixed;left:0;top:0;pointer-events:none;z-index:200;opacity:.9;box-shadow:0 4px 14px rgba(0,0,0,.25);transform:translate('+(x+8)+'px,'+(y+8)+'px)';document.body.appendChild(g);DRAG.g=g;document.body.classList.add('dragging')}
function endDrag(){if(DRAG){clearTimeout(DRAG.timer);DRAG.g&&DRAG.g.remove()}DRAG=null;document.body.classList.remove('dragging');$$('.dz').forEach(z=>z.classList.remove('dz'))}
document.addEventListener('pointerdown',e=>{if(!ADM)return;const c=e.target.closest&&e.target.closest('.chp.adm[data-k]');if(!c)return;DRAG={c,k:c.dataset.k,from:c.dataset.room||'',idx:+c.dataset.idx,x:e.clientX,y:e.clientY,on:false,t:e.pointerType};if(e.pointerType==='touch')DRAG.timer=setTimeout(()=>startDrag(DRAG.x,DRAG.y),250)});
document.addEventListener('pointermove',e=>{if(!DRAG)return;const dx=Math.abs(e.clientX-DRAG.x),dy=Math.abs(e.clientY-DRAG.y);if(!DRAG.on){if(DRAG.t==='touch'){if(dx>8||dy>8){clearTimeout(DRAG.timer);DRAG=null}}else if(dx>5||dy>5)startDrag(e.clientX,e.clientY);return}
 DRAG.g.style.transform='translate('+(e.clientX+8)+'px,'+(e.clientY+8)+'px)';$$('.dz').forEach(z=>z.classList.remove('dz'));const el=document.elementFromPoint(e.clientX,e.clientY),z=el&&el.closest('[data-drop]');if(z)z.classList.add('dz')});
document.addEventListener('touchmove',e=>{if(DRAG&&DRAG.on)e.preventDefault()},{passive:false});
document.addEventListener('pointerup',e=>{if(!DRAG)return;const d=DRAG,was=d.on;let to=null;if(was){const el=document.elementFromPoint(e.clientX,e.clientY),z=el&&el.closest('[data-drop]');if(z)to=z.dataset.drop}endDrag();if(was){SUP=Date.now();if(to)dropTo(d,to)}});
document.addEventListener('pointercancel',endDrag);
document.addEventListener('click',e=>{const c=e.target.closest&&e.target.closest('.chp[data-k],.chp[data-lg]');if(!c||Date.now()-SUP<=400)return;c.dataset.lg?showLegacy(c.dataset.lg):openStu(c.dataset.k,c.dataset.room,+c.dataset.idx)});
/* ===== Khôi phục tính năng cũ: thông tin học viên, xóa/thêm/hết hạn, Dashboard, xuất Excel, tải đề, DS Drive ===== */
const parseDMY=v=>{const m=String(v||'').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);return m?new Date(+m[3],+m[2]-1,+m[1]):null};
const expired=x=>{const d=parseDMY(x.to);if(!d)return false;const t=new Date();t.setHours(0,0,0,0);return d<t};
const WL=()=>{const d=new Date(),wd=(d.getDay()+6)%7,mon=new Date(d.getFullYear(),d.getMonth(),d.getDate()-wd),add=n=>new Date(mon.getFullYear(),mon.getMonth(),mon.getDate()+n),f=x=>String(x.getDate()).padStart(2,'0')+'/'+String(x.getMonth()+1).padStart(2,'0');return{w:'Trong tuần ('+f(mon)+' – '+f(add(4))+')',t7:'Thứ Bảy '+f(add(5)),cn:'Chủ Nhật '+f(add(6))}};
const nobj=t=>{const s=nz(t);return /bac si|^bs/.test(s)?'Bác sĩ':/cu nhan|ktv|phcn/.test(s)?'Cử nhân PHCN':/(^| )y si|^ys/.test(s)?'Y sĩ':'Khác'};
const rebuildStu=()=>{students=STU_RAW.concat(EXTRA).filter(x=>REMOVED.indexOf(skey(x))<0)};
let STU_SRC='',STU_ERR='';
const mk=(v,a,b)=>{v=String(v||'');return v.length>a+b?v.slice(0,a)+'•'.repeat(v.length-a-b)+v.slice(-b):v?'•'.repeat(v.length):''};
const stuTable=x=>`<table class="tbl"><tr><td>Chức danh</td><td><b>${esc(x.t||'—')}</b></td></tr><tr><td>Ngày sinh</td><td><b>${esc(x.d?(ADM?x.d:String(x.d).replace(/^\d{1,2}\/\d{1,2}\//,'••/••/')):'—')}</b></td></tr><tr><td>SĐT</td><td><b>${x.phone?(ADM?`<a href="tel:${esc(x.phone)}">${esc(x.phone)}</a>`:esc(mk(x.phone,2,3))):'—'}</b></td></tr>${x.cccd?`<tr><td>CCCD</td><td><b>${esc(ADM?x.cccd:mk(x.cccd,3,3))}</b></td></tr>`:''}<tr><td>Thời gian thực tập</td><td><b>${esc(x.tg||((x.from||'?')+' → '+(x.to||'?')))}</b>${expired(x)?' <span class="text-danger font-weight-bold">⚠ đã hết hạn</span>':''}</td></tr><tr><td>Ghi chú</td><td>${esc(x.note||'—')}</td></tr></table>${ADM?'':'<p class="text-muted small mb-0">Thông tin nhạy cảm chỉ quản trị viên xem đầy đủ.</p>'}`;
const stripRole=e=>e.split('|')[0].replace(/^(CCHN KTV|CCHN YS|BS|YS|KTV|CN|SV)\s+/i,'').trim();
function findStu(name){const nn=x=>fold(x).toLowerCase().replace(/\s+/g,' ').trim(),c=nn(stripRole(name).replace(/\b(19|20)\d{2}\b/g,''));if(!c)return[];let L=students.filter(x=>x.n&&nn(x.n)===c);if(L.length)return L.slice(0,3);L=students.filter(x=>x.n&&nn(x.n).endsWith(' '+c));return L.slice(0,3)}
function showLegacy(n){const L=findStu(n),m=modal(`<h5>${esc(L.length===1?L[0].n:n)}</h5>${L.length?L.map(stuTable).join('<hr>'):'<p class="text-muted">Chưa có trong danh sách học viên'+(STU_SRC?' ('+esc(STU_SRC)+')':'')+'.</p>'}${L.length>1?'<p class="text-muted">Có '+L.length+' học viên trùng tên, hiển thị tất cả.</p>':''}<button class="btn btn-soft mt-2" id="sc">Đóng</button>`);$('#sc',m).onclick=()=>m.remove()}
function openStu(k,rm,idx){const x=sbyk(k),mt=META[k]||{},pl=rm&&ROOMS2?((ROOMS2[TAB]||{})[rm]||[])[idx]:null,others=RAI.filter(([id])=>id!==rm);
 const m=modal(`<h5>${esc(x?x.n:k.split('|')[0])}</h5>${x?stuTable(x):'<p class="text-muted">Không còn trong danh sách.</p>'}${ADM?`${pl?`<label class="mt-2">Ghi chú ca (hiện sau tên)</label><input class="form-control" id="sn" value="${esc(pl.note||'')}" placeholder="sáng, chiều…">`:''}<label class="mt-2">Số ngày đã nghỉ bù</label><input class="form-control" id="so" value="${esc(mt.off||'')}"><div class="custom-control custom-checkbox mt-2"><input type="checkbox" class="custom-control-input" id="ss" ${mt.star?'checked':''}><label class="custom-control-label" for="ss">Dấu * (đúng 07h có mặt)</label></div>${rm?`<label class="mt-2">Thêm sang phòng khác (ví dụ ca chiều)</label><div class="d-flex" style="gap:6px"><select id="sr" class="form-control">${others.map(([id,n])=>`<option value="${id}">${n}</option>`).join('')}</select><button class="btn btn-soft" id="sa">Thêm</button></div>`:''}<div class="d-flex mt-3 flex-wrap" style="gap:8px"><button class="btn btn-primary" id="sv">Lưu</button>${pl?'<button class="btn btn-soft" id="su">Bỏ khỏi phòng</button>':''}<button class="btn btn-soft ml-auto" id="sc">Đóng</button></div><button class="btn btn-danger btn-block mt-3" id="sd">Xóa khỏi danh sách học viên</button>`:'<button class="btn btn-soft mt-3" id="sc">Đóng</button>'}`);
 $('#sc',m).onclick=()=>m.remove();if(!ADM)return;audit('Xem thông tin học viên '+(x?x.n:k.split('|')[0]));
 $('#sv',m).onclick=()=>{if(pl)pl.note=$('#sn',m).value.trim();META[k]={...META[k],off:$('#so',m).value.trim(),star:$('#ss',m).checked};if(pl)saveRooms();saveMeta();audit('Sửa ghi chú/dấu */nghỉ bù của '+(x?x.n:k.split('|')[0]));m.remove();R.rooms()};
 const u=$('#su',m);if(u)u.onclick=()=>{ROOMS2[TAB][rm].splice(idx,1);saveRooms();m.remove();R.rooms()};
 const a=$('#sa',m);if(a)a.onclick=()=>{const to=$('#sr',m).value,dst=ROOMS2[TAB][to]=ROOMS2[TAB][to]||[];dst.push({k,note:''});saveRooms();m.remove();R.rooms()};
 $('#sd',m).onclick=async()=>{if(await delStudent(k)){m.remove();R.rooms()}}}
async function delStudent(k){const x=sbyk(k),nm=x?x.n:k.split('|')[0];if(!await ask({title:'Xóa học viên',msg:'Xóa '+nm+' khỏi danh sách học viên? Người này cũng bị bỏ khỏi tất cả các phòng.',ok:'Xóa'}))return false;
 if(EXTRA.some(y=>skey(y)===k))EXTRA=EXTRA.filter(y=>skey(y)!==k);else if(REMOVED.indexOf(k)<0)REMOVED.push(k);delete META[k];
 ['w','t7','cn'].forEach(d=>Object.keys((ROOMS2||{})[d]||{}).forEach(r=>{ROOMS2[d][r]=ROOMS2[d][r].filter(p=>p.k!==k)}));rebuildStu();saveRooms();saveMeta();audit('Xóa học viên '+nm);
 toast('Đã xóa '+nm,0,()=>{REMOVED=REMOVED.filter(z=>z!==k);rebuildStu();saveMeta();R.rooms()});return true}
const expiredCard=()=>{const L=students.filter(expired);return L.length?`<div class="card no-print" style="border-left:4px solid var(--no)"><div class="card-header text-danger">⚠ ${L.length} học viên đã hết thời gian thực tập – nên xóa khỏi danh sách</div><div class="card-body">${L.map(x=>`<div class="d-flex align-items-center py-1" style="gap:8px"><span class="flex-fill">${esc(role(x)+' '+x.n)} <small class="text-muted">(đến ${esc(x.to)})</small></span><button class="btn btn-danger btn-sm" data-dx="${esc(skey(x))}">Xóa</button></div>`).join('')}</div></div>`:''};
function poolCard(){const un=students.filter(x=>!placed(x)),g={BS:[],KTV:[],YS:[]};un.forEach(x=>g[role(x)].push(x));
 const col=(a,t)=>`<div class="pc"><b>${t}</b> <span class="badge badge-pill bg-ok">${g[a].length}</span><div class="mt-2">${g[a].map(chipPool).join('')||'<span class="text-muted">—</span>'}</div></div>`,
 rem=REMOVED.map(k=>{const x=STU_RAW.find(y=>skey(y)===k);return x?`<div class="d-flex py-1" style="gap:8px"><span class="flex-fill">${esc(x.n)}</span><button class="btn btn-soft btn-sm" data-rs="${esc(k)}">Khôi phục</button></div>`:''}).join('');
 return expiredCard()+`<div class="card no-print" data-drop="pool"><div class="card-header">Học viên chưa phân phòng <span class="badge badge-pill bg-ok">${un.length}</span></div><div class="card-body"><div class="pool3">${col('BS','Bác sĩ')}${col('KTV','KTY PHCN')}${col('YS','Y sĩ')}</div><div class="d-flex flex-wrap mt-3" style="gap:6px"><input id="xn" class="form-control" style="flex:1;min-width:180px" placeholder="Gõ thêm tên học viên…" aria-label="Tên học viên mới"><select id="xt" class="form-control" style="width:auto"><option value="BS">BS</option><option value="KTV">KTV</option><option value="YS">YS</option></select><button class="btn btn-primary" id="xadd">Thêm</button></div>${rem?`<details class="mt-3"><summary class="text-muted" style="cursor:pointer">Học viên đã xóa (${REMOVED.length}) – khôi phục</summary>${rem}</details>`:''}</div></div>`}
function bindRoomAdmin(){const a=$('#xadd');if(a)a.onclick=()=>{const n=$('#xn').value.trim().replace(/\s+/g,' ');if(!n)return;const t={BS:'Bác sĩ',KTV:'KTY PHCN',YS:'Y sĩ YHCT'}[$('#xt').value],x={n,d:'',phone:'',t,tg:'',from:'',to:'',note:'',extra:true};if(students.some(y=>skey(y)===skey(x)))return toast('Học viên này đã có trong danh sách',1);EXTRA.push(x);rebuildStu();saveMeta();audit('Thêm học viên '+n);R.rooms()};
 $$('[data-rs]',view).forEach(b=>b.onclick=()=>{REMOVED=REMOVED.filter(z=>z!==b.dataset.rs);rebuildStu();saveMeta();audit('Khôi phục học viên đã xóa');R.rooms()});
 $$('[data-dx]',view).forEach(b=>b.onclick=async()=>{if(await delStudent(b.dataset.dx))R.rooms()})}
/* --- Danh sách học viên từ file Excel trên Drive --- */
function parseStu(rows){let h=-1;for(let i=0;i<rows.length;i++){if(rows[i].some(c=>fold(String(c)).toLowerCase().replace(/\s+/g,' ').trim()==='ho va ten')){h=i;break}}if(h<0)return[];
 const H=rows[h].map(c=>fold(String(c)).toLowerCase().replace(/\s+/g,' ').trim()),col=re=>H.findIndex(x=>re.test(x)),cN=col(/^ho va ten/),cD=col(/nam sinh|ngay sinh/),cP=col(/^sdt|so dien thoai/),cT=col(/^doi tuong|chuc danh/),cR=col(/^phong/),cG=col(/^thoi gian/),cC=col(/cccd|can cuoc|cmnd|dinh danh/),cK=H.map((x,i)=>/^ghi chu/.test(x)?i:-1).filter(i=>i>=0),out=[];
 for(let i=h+1;i<rows.length;i++){const r=rows[i],n=String(r[cN]||'').trim();if(!n||!(String(r[cT]||'').trim()||String(r[cP]||'').trim()))continue;const tg=String(r[cG]||'').replace(/\s+/g,' ').trim(),m=tg.match(/(\d{1,2}\/\d{1,2}\/\d{4}).*?(\d{1,2}\/\d{1,2}\/\d{4})/);let ph=String(r[cP]||'').replace(/\D/g,'');if(ph.length===9)ph='0'+ph;
  out.push({n,d:String(r[cD]||'').trim(),phone:ph,cccd:cC>=0?String(r[cC]||'').replace(/\s/g,''):'',t:String(r[cT]||'').replace(/\s+/g,' ').trim(),room:String(r[cR]||'').trim(),tg,from:m?m[1]:'',to:m?m[2]:'',note:cK.map(k=>String(r[k]||'').replace(/\s+/g,' ').trim()).filter(x=>x).join('; ')})}return out}
async function loadStudents(){if(!OK||!FILES.length||typeof XLSX==='undefined')return;
 const L=FILES.filter(f=>(/spreadsheet|excel/i.test(f.mime)||/\.xlsx?$/i.test(f.name))&&/(^| )(ds sv|ds hoc vien|danh sach sinh vien|danh sach hoc vien)( |$)/.test(nz(f.name))).sort((a,b)=>(b.modified||0)-(a.modified||0));if(!L.length){STU_SRC='';return}
 try{const r=await api({action:'file',id:L[0].id});if(r.error)throw new Error(r.error);const wb=XLSX.read(r.b64,{type:'base64'}),o=parseStu(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,raw:false,defval:''}));if(!o.length)throw new Error('Không đọc được học viên (dòng tiêu đề cần có “Họ và tên”)');STU_RAW=o;STU_SRC=L[0].name;STU_ERR='';rebuildStu()}catch(e){STU_ERR=String(e.message||e)}}
/* --- Xuất kết quả cuối đợt, tải đề thi --- */
const periodText=(f,t)=>f&&t?'Từ ngày '+f+' đến ngày '+t:f?'Từ ngày '+f:t?'Đến ngày '+t:'';
function scoreFor(name,obj){const l=results.filter(r=>norm(r.n)===norm(name)&&nobj(r.t)===obj&&r.type!=='wheel'&&r.sc!=null&&r.sc!=='—');return l.length?l[l.length-1].sc:''}
async function expEnd(obj){const d=new Date(),mo='THÁNG '+(d.getMonth()+1)+'/'+d.getFullYear(),ngay='TP. Hồ Chí Minh, ngày '+String(d.getDate()).padStart(2,'0')+' tháng '+String(d.getMonth()+1).padStart(2,'0')+' năm '+d.getFullYear(),list=students.filter(s=>nobj(s.t)===obj),ktv=obj==='Cử nhân PHCN',
 title=ktv?'DANH SÁCH KTV VLTL CHỨNG CHỈ HÀNH NGHỀ THI THỰC HÀNH CUỐI ĐỢT '+mo:obj==='Y sĩ'?'DANH SÁCH Y SĨ THỰC HÀNH CHỨNG CHỈ HÀNH NGHỀ THI CUỐI ĐỢT '+mo:'DANH SÁCH BÁC SĨ CHỨNG CHỈ HÀNH NGHỀ THI CUỐI ĐỢT '+mo;
 if(typeof XLSX==='undefined')return toast('Chưa tải thư viện Excel',1);
 if(!list.length&&!await ask({title:'Chưa có học viên',msg:'Chưa có học viên '+obj+' trong danh sách. Vẫn tạo file mẫu trống?',ok:'Tạo file'}))return;
 const rows=[['BỆNH VIỆN Y HỌC CỔ TRUYỀN THÀNH PHỐ HỒ CHÍ MINH','','CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM'],['KHOA VLTL - PHCN','','Độc lập - Tự do - Hạnh phúc'],['','',ngay],[title],[]];
 if(ktv){rows.push(['STT','Họ và tên','Thời gian thực hành','Ký tên','Điểm thi','Người hướng dẫn']);list.forEach((s,i)=>rows.push([i+1,s.n,periodText(s.from,s.to),'',scoreFor(s.n,obj),'']))}
 else{rows.push(['STT','Họ và tên','Thời gian thực tập','Ký tên','','Người hướng dẫn tại khoa'],['','','','Lý thuyết','Thực hành','']);list.forEach((s,i)=>rows.push([i+1,s.n,periodText(s.from,s.to),scoreFor(s.n,obj),'','']))}
 rows.push([],['','','Trưởng khoa'],[],[],[],['','','Nguyễn Thị Ly Châu']);
 const ws=XLSX.utils.aoa_to_sheet(rows);ws['!cols']=[{wch:6},{wch:28},{wch:40},{wch:14},{wch:14},{wch:22}];const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'KetQua');
 const fn='Ket_qua_'+(ktv?'KTV':obj==='Y sĩ'?'YSi':'BS')+'_cuoi_dot_'+d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+'.xlsx';XLSX.writeFile(wb,fn);audit('Xuất kết quả cuối đợt '+obj);
 if(OK&&ADM){try{const r=await api({action:'saveExport'},{pin:ADM,name:fn,data:XLSX.write(wb,{type:'base64',bookType:'xlsx'})});toast(r&&r.ok?'Đã tải về và lưu lên Drive':'Đã tải về máy. Chưa lưu Drive: '+(r&&r.error||''),!(r&&r.ok))}catch(e){toast('Đã tải về máy. Chưa lưu Drive: '+e.message,1)}}else toast('Đã tải file về máy')}
const paperHTML=r=>`<html><head><meta charset="utf-8"><title>Đề thi</title><style>body{font-family:'Times New Roman';font-size:12pt}.q{margin:8pt 0}.ok{color:#0a7d3a;font-weight:bold}.bad{color:#c00000}</style></head><body><h2 style="text-align:center">ĐỀ THI KẾT THÚC THỰC HÀNH – KHOA VLTL – PHCN</h2><p>Họ tên: <b>${esc(r.n)}</b> – Ngày sinh: ${esc(r.d)}<br>Đối tượng: ${esc(r.t)}${r.ph&&r.t==='Cử nhân PHCN'?' – '+esc(r.ph):''} – Bộ đề số ${r.set}<br>Thời điểm nộp: ${esc(r.at)}<br>Kết quả: ${r.ok}/${r.tot} câu đúng – Điểm: <b>${r.sc}</b>/10</p><hr>${r.qs.map((q,k)=>`<div class="q"><b>Câu ${k+1}.</b> ${esc(q.q)}${q.o.map((t,m)=>`<div class="${m===q.a?'ok':(r.ans[k]===m?'bad':'')}">${'ABCD'[m]}. ${esc(t)}${m===q.a?' ✔':''}${r.ans[k]===m?' ◄ thí sinh chọn':''}</div>`).join('')}</div>`).join('')}</body></html>`;
function dlr(ix){const r=results[ix];if(!r||!r.qs)return toast('Không có dữ liệu đề thi',1);audit('Tải đề thi của '+r.n);const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([paperHTML(r)],{type:'application/msword'}));a.download='de_thi_'+fold(r.n).replace(/\W+/g,'_')+'_de'+r.set+'.doc';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500)}
async function dlPin(ix){const p=await ask({title:'Quản trị viên',msg:'Nhập mật khẩu để tải đề thi của thí sinh.',input:'password',ok:'Tải'});if(!p)return;if(!OK)return toast('Chưa cấu hình kết nối Drive',1);try{const r=await api({action:'auth'},{pin:p});r.ok?dlr(ix):toast('Sai mật khẩu',1)}catch(e){toast('Không kết nối được máy chủ',1)}}
/* --- Trợ lý AI: phân phòng (tên được ẩn danh) --- */
function nameVariants(k){const x=sbyk(k);if(!x)return[];const t=x.n.trim().split(/\s+/),v=[x.n];if(t.length>=3)v.push(t.slice(-2).join(' '));const one=t[t.length-1];if(one.length>=3&&students.filter(y=>fold(y.n).toLowerCase().split(/\s+/).pop()===fold(one).toLowerCase()).length===1)v.push(one);return v}
function maskText(text,items){const orig=text.normalize('NFC'),f=fold(orig).toLowerCase(),g={};items.forEach(it=>{const n=fold(it.name).toLowerCase().trim();if(n.length>=3)(g[n]=g[n]||[]).push(it.id)});const hits=[];
 Object.keys(g).sort((a,b)=>b.length-a.length).forEach(n=>{const re=new RegExp('(^|[^a-z0-9])('+n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s+')+')(?![a-z0-9])','g');let m;while((m=re.exec(f))){const a=m.index+m[1].length,b=a+m[2].length;if(!hits.some(h=>a<h.b&&b>h.a))hits.push({a,b,t:'học viên '+[...new Set(g[n])].join(' và ')})}});
 hits.sort((x,y)=>y.a-x.a);let out=orig;hits.forEach(h=>{out=out.slice(0,h.a)+h.t+out.slice(h.b)});return out}
function aiEnts(){const L=[],Rm=(ROOMS2&&ROOMS2[TAB])||{};RAI.forEach(([id])=>(Rm[id]||[]).forEach(p=>L.push({k:p.k,note:p.note||'',room:id})));students.filter(x=>!placed(x)).forEach(x=>L.push({k:skey(x),note:'',room:'none'}));return L}
async function aiRooms(){const o=$('#aiw'),raw=($('#air').value||'').trim()||'Chia đều vào các phòng',E=aiEnts();if(!E.length){o.innerHTML='<p class="text-muted">Tab này chưa có học viên để phân.</p>';return}
 o.innerHTML='<span class="text-muted">Đang hỏi trợ lý AI…</span>';
 try{const items=[];E.forEach((e,i)=>nameVariants(e.k).forEach(n=>items.push({name:n,id:'H'+(i+1)})));
  const r=await api({action:'aiRooms'},{pin:ADM,text:maskText(raw,items),rooms:RAI.map(([id,name])=>({id,name})),students:E.map((e,i)=>{const x=sbyk(e.k);return{id:'H'+(i+1),role:x?role(x):'khác',note:e.note,cur:e.room}})});
  if(r.error)throw new Error(r.error);const ids=RAI.map(a=>a[0]),a=r.assign||{};
  for(let i=0;i<E.length;i++){const v=a['H'+(i+1)];if(v!=='none'&&ids.indexOf(v)<0)throw new Error('AI trả kết quả chưa hợp lệ, hãy thử lại')}
  AIR={E,a};const nm=Object.fromEntries(RAI);nm.none='Chưa phân phòng';const mv=E.map((e,i)=>({e,to:a['H'+(i+1)]})).filter(m=>m.e.room!==m.to);
  o.innerHTML=(mv.length?`<p><b>${mv.length}</b> thay đổi:</p><div class="ov"><table class="tbl"><tr><th>Học viên</th><th>Từ</th><th>Sang</th></tr>${mv.map(m=>{const x=sbyk(m.e.k);return `<tr><td>${esc(x?role(x)+' '+x.n:m.e.k)}${m.e.note?' · '+esc(m.e.note):''}</td><td>${nm[m.e.room]}</td><td><b>${nm[m.to]}</b></td></tr>`}).join('')}</table></div><button class="btn btn-primary mt-2" id="aiap">Áp dụng phân phòng này</button>`:'<p class="text-muted">Không có thay đổi nào.</p>')+`<p class="text-muted">${esc(r.note||'')}</p>`;
  const b=$('#aiap');if(b)b.onclick=()=>{const snap=JSON.stringify(ROOMS2),nd={};AIR.E.forEach((e,i)=>{const v=AIR.a['H'+(i+1)];if(v!=='none')(nd[v]=nd[v]||[]).push({k:e.k,note:e.note})});RMD()[TAB]=nd;audit('Áp dụng phân phòng do trợ lý AI đề xuất ('+TABS[TAB]+')');saveRooms();R.rooms();toast('Đã áp dụng phân phòng',0,()=>{ROOMS2=JSON.parse(snap);saveRooms();R.rooms()})}}
 catch(e){o.innerHTML=`<p class="text-danger">${esc(e.message)}</p>`}}
/* --- Trợ lý AI: mở / đóng thi --- */
const EXK=[];[0,1,2].forEach(i=>LB[i].forEach(l=>EXK.push([SUBJ[i]+'|'+l,NSET[i]])));let AIX=[];
async function aiExam(){const t=$('#aiq').value.trim(),o=$('#aio');if(!t)return;o.innerHTML='<span class="text-muted">Đang hỏi trợ lý AI…</span>';
 try{const r=await api({action:'aiExam'},{pin:ADM,text:t,state:open});if(r.error)throw new Error(r.error);
  AIX=(r.actions||[]).filter(a=>{const k=EXK.find(x=>x[0]===a.key);return k&&typeof a.on==='boolean'&&(!a.on||(Number.isInteger(a.set)&&a.set>=1&&a.set<=k[1]))});
  o.innerHTML=(AIX.length?`<table class="tbl"><tr><th>Mục thi</th><th>Thao tác</th></tr>${AIX.map(a=>`<tr><td>${esc(a.key.replace('|',' – '))}</td><td><b>${a.on?'MỞ – đề '+a.set:'ĐÓNG'}</b></td></tr>`).join('')}</table><button class="btn btn-primary mt-2" id="aiap">Áp dụng</button>`:'<p class="text-muted">Không có thay đổi nào được đề xuất.</p>')+`<p class="text-muted">${esc(r.note||'')}</p>`;
  const b=$('#aiap');if(b)b.onclick=()=>{AIX.forEach(a=>{const c=open[a.key]||{on:false,set:1};open[a.key]={on:a.on,set:a.on?a.set:c.set||1}});audit('Áp dụng đề xuất của trợ lý AI (mở/đóng thi): '+AIX.map(a=>a.key.replace('|',' – ')+(a.on?' MỞ đề '+a.set:' ĐÓNG')).join('; '));SV('open',open);api({action:'setConfig'},{pin:ADM,open}).then(r=>{toast(r.ok?'Đã áp dụng và lưu cấu hình thi':'Chưa lưu được: '+(r.error||'lỗi'),!r.ok);R.admin()})}}
 catch(e){o.innerHTML=`<p class="text-danger">${esc(e.message)}</p>`}}
/* --- Vòng quay dạng ô số (slot) --- */
const WHEEL_N={0:3,1:8,2:3},wheelOn=i=>!!(open['wheel|'+SUBJ[i]]&&open['wheel|'+SUBJ[i]].on);
function wheelPool(i){const seen={},L=[];bkFiles(i).forEach((f,k)=>{const name=f.name.replace(/\.[a-z0-9]+$/i,''),m=name.match(/(?:^|[\s_-])(\d{1,3})(?:[\s._-]|$)/)||name.match(/(\d{1,3})/),num=m?String(+m[1]):String(k+1);if(!seen[num]){seen[num]=1;L.push({num,name,id:f.id})}});
 return L.length?L.sort((a,b)=>a.num-b.num):(D.CHECK||[1,2,3,4,5,6,7,8].map(n=>['Bảng kiểm QTKT số '+n])).map((c,k)=>({num:String(k+1),name:c[0],id:null}))}
const wItems=L=>`<ol class="mb-0">${L.map(it=>`<li class="mb-2"><b>${esc(it.num?it.num+'. ':'')}${esc(it.name)}</b>${it.id?` <button class="btn btn-soft btn-sm" data-id="${it.id}" data-n="${esc(it.name)}">Xem</button> <a class="btn btn-soft btn-sm" target="_blank" rel="noopener" href="https://drive.google.com/uc?export=download&id=${it.id}">Tải</a>`:''}</li>`).join('')}</ol>`;
const bindDrive=r=>$$('[data-id]',r).forEach(b=>b.onclick=()=>openDrive(b.dataset.id,b.dataset.n));
function wheelMount(i){const n=WHEEL_N[i]||3;
 view.insertAdjacentHTML('beforeend',(wheelOn(i)?`<div class="card" style="border:2px solid var(--pr)"><div class="card-header">Quay bảng kiểm QTKT – ${SUBJ[i]}</div><div class="card-body text-center"><p class="text-muted">Bấm QUAY: ${n} ô số sẽ chạy và dừng lần lượt, mỗi ô là một bảng kiểm bạn sẽ thi.</p><div class="row justify-content-center"><div class="col-md-4 mb-2"><input class="form-control" id="wn" placeholder="Họ và tên" aria-label="Họ và tên"></div><div class="col-md-3 mb-2"><input class="form-control" id="wd" placeholder="dd/mm/yyyy" aria-label="Ngày sinh"></div></div><div class="slots">${Array.from({length:n},()=>'<div class="slot" aria-live="polite">?</div>').join('')}</div><button class="btn btn-primary btn-lg" id="spin"><i class="fas fa-dice"></i> QUAY</button><div id="wres" class="text-left mt-4"></div></div></div>`:'')+`<div class="card"><div class="card-header">Tra cứu bảng kiểm đã quay</div><div class="card-body"><div class="d-flex flex-wrap" style="gap:8px"><input class="form-control" style="max-width:240px" id="wln" placeholder="Họ tên"><input class="form-control" style="max-width:180px" id="wld" placeholder="dd/mm/yyyy"><button class="btn btn-soft" id="wlk">Xem</button></div><div id="wlo" class="mt-3"></div></div></div>`);
 if(wheelOn(i))$('#spin').onclick=()=>spinSlots(i);
 $('#wlk').onclick=()=>{const nm=norm($('#wln').value),d=norm($('#wld').value),rec=LS('wheel_log',[]).filter(r=>r.t===SUBJ[i]&&norm(r.n)===nm&&(!d||norm(r.d)===d)).pop(),o=$('#wlo');
  o.innerHTML=rec?`<div class="alert alert-info">Kết quả lúc ${esc(rec.at)}</div>${wItems(rec.items)}`:'<p class="text-muted">Chưa có kết quả quay cho học viên này.</p>';bindDrive(o)}}
function spinSlots(i){const n=WHEEL_N[i]||3,pool=wheelPool(i),name=$('#wn').value.trim(),d=$('#wd').value.trim();
 if(!name)return toast('Vui lòng nhập họ tên học viên',1);if(pool.length<n)return toast('Chưa đủ bảng kiểm trên Drive (cần ít nhất '+n+')',1);
 const old=LS('wheel_log',[]).filter(r=>r.t===SUBJ[i]&&norm(r.n)===norm(name)&&(!d||norm(r.d)===norm(d))).pop();
 const go=()=>{const pick=shf(pool,Math.random).slice(0,n),boxes=$$('.slot'),btn=$('#spin');btn.disabled=true;$('#wres').innerHTML='';
  boxes.forEach(b=>{b.classList.remove('hit');b.classList.add('spin')});
  const iv=setInterval(()=>boxes.forEach(b=>{if(b.classList.contains('spin'))b.textContent=pool[Math.floor(Math.random()*pool.length)].num}),70);
  pick.forEach((p,k)=>setTimeout(()=>{boxes[k].textContent=p.num;boxes[k].classList.remove('spin');boxes[k].classList.add('hit');
   if(k===n-1){clearInterval(iv);btn.disabled=false;const items=pick.map(x=>({num:x.num,name:x.name,id:x.id})),rec={n:name,d,t:SUBJ[i],at:new Date().toLocaleString('vi-VN'),items};
    const w=LS('wheel_log',[]);w.push(rec);SV('wheel_log',w);audit('Quay bảng kiểm QTKT ('+SUBJ[i]+'): '+items.map(x=>x.num).join(', '),name);if(OK)api({action:'saveWheel'},{n:name,d,t:SUBJ[i],items:items.map(x=>x.num+'. '+x.name)}).catch(()=>{});
    $('#wres').innerHTML=`<div class="alert alert-success">Kết quả quay cho <b>${esc(name)}</b>: bảng kiểm số <b>${items.map(x=>x.num).join(', ')}</b></div>${wItems(items)}`;bindDrive($('#wres'));toast('Đã lưu kết quả quay')}},1500+k*1100))};
 old?ask({title:'Học viên đã quay trước đó',msg:'Đã có kết quả quay của học viên này. Quay lại sẽ thêm kết quả mới. Tiếp tục?',ok:'Quay lại'}).then(y=>y&&go()):go()}
/* ===================== ĐIỂM DANH ===================== */
document.head.insertAdjacentHTML('beforeend','<style>'+
'.ab{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--bd);background:var(--card);color:inherit;border-radius:6px;padding:5px 10px;font-size:12.5px;cursor:pointer;line-height:1.2;min-height:34px}'+
'.ab:hover{border-color:var(--pr)}.ab.sm{padding:3px 8px;min-height:28px;font-size:12px}'+
'.ab.P{border-left:4px solid #3ac47d}.ab.L{border-left:4px solid #f7b924}.ab.E{border-left:4px solid #16aaff}.ab.U{border-left:4px solid #d92550}'+
'.ab.on{color:#fff;border-color:transparent}.ab.on.P{background:#3ac47d}.ab.on.L{background:#f7b924;color:#1e2a3a}.ab.on.E{background:#16aaff}.ab.on.U{background:#d92550}'+
'.arow{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:9px 0;border-bottom:1px solid var(--bd)}.arow:last-child{border-bottom:0}'+
'.arow .nm{flex:1 1 200px;min-width:150px}.arow .bt{display:flex;flex-wrap:wrap;gap:6px}'+
'.sugt{font-size:11px;color:#0b7bc4;font-weight:600}.rt{font-size:12px;font-weight:700;padding:2px 8px;border-radius:12px;display:inline-block;margin-top:2px}'+
'.att-sticky{position:sticky;bottom:0;z-index:5}@media print{.att-sticky{display:none}}'+
'</style>');

const AST={P:{l:'Có mặt',f:'Có mặt',ic:'fa-check'},L:{l:'Trễ',f:'Trễ',ic:'fa-clock'},E:{l:'Có phép',f:'Vắng có phép',ic:'fa-envelope-open'},U:{l:'Không phép',f:'Vắng không phép',ic:'fa-user-times'}};
const AK=['P','L','E','U'];
const pad2=n=>String(n).padStart(2,'0'),isoD=d=>d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());
const dmyS=s=>{const p=s.split('-');return p[2]+'/'+p[1]+'/'+p[0]};
const dateOf=s=>{const p=s.split('-').map(Number);return new Date(p[0],p[1]-1,p[2])};
const WDN=['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'];
const dayTab=s=>{const w=dateOf(s).getDay();return w===6?'t7':w===0?'cn':'w'};   // khớp 3 tab của ROOMS2
const attPin=()=>ADM||STF;
const AT={date:isoD(new Date()),s:new Date().getHours()<12?'S':'C',rows:[],ld:'',cur:{},dirty:false,err:'',who:LS('vltl_att_who','')||''};
const sesName=s=>s==='S'?'Sáng':'Chiều';

/* --- Đăng nhập: một ô mật khẩu, máy chủ tự xác định Quản trị viên / Nhân viên khoa --- */
async function attLogin(){
 const p=await ask({title:'Điểm danh',msg:'Nhập mật khẩu Quản trị viên hoặc Nhân viên khoa.',input:'password',ok:'Đăng nhập'});
 if(!p)return false;
 if(!OK){toast('Chưa cấu hình kết nối Google Drive (API)',1);return false}
 try{const r=await api({action:'authRole'},{pin:p});
  if(r&&r.ok){
   if(r.role==='admin'){ADM=p;try{sessionStorage.setItem('vltl_adm',p)}catch(e){}buildMenu();audit('Đăng nhập quản trị (từ trang Điểm danh)')}
   else{STF=p;try{sessionStorage.setItem('vltl_stf',p)}catch(e){}audit('Đăng nhập Nhân viên khoa','Nhân viên khoa')}
   toast('Đã đăng nhập');return true}
  if(r&&r.error==='action')toast('Máy chủ chưa cập nhật Apps Script (thiếu action authRole)',1);
  else{audit('Đăng nhập Điểm danh thất bại','Không xác định');toast('Sai mật khẩu',1)}
 }catch(e){toast('Không kết nối được máy chủ',1)}
 return false}
function attPinBad(){STF='';ADM='';try{sessionStorage.removeItem('vltl_stf');sessionStorage.removeItem('vltl_adm')}catch(e){}buildMenu();toast('Mật khẩu không còn hiệu lực. Vui lòng đăng nhập lại.',1);location.hash='#/';return false}

/* --- Danh sách học viên theo buổi (ROOMS2[tab của ngày]) --- */
const caOf=note=>{const n=nz(note||''),m=/(^| )sang( |$)/.test(n),c=/(^| )chieu( |$)/.test(n);return m&&!c?'sáng':c&&!m?'chiều':''};
function attRoster(date,ses){
 const Rm=(ROOMS2&&ROOMS2[dayTab(date)])||{},seen={},L=[];
 RAI.forEach(([id,name])=>(Rm[id]||[]).forEach(p=>{
  const x=sbyk(p.k);if(!x||seen[p.k])return;
  const ca=caOf(p.note);if((ses==='S'&&ca==='chiều')||(ses==='C'&&ca==='sáng'))return;   // ghi chú ca "chiều" → không hiện ở buổi sáng và ngược lại
  seen[p.k]=1;L.push({k:p.k,x,room:id,rname:name,note:p.note||''})}));
 return L}
/* Nghỉ phép đã duyệt: META[skey].leaves ('dd/mm/yyyy' hoặc {d,...}); bỏ qua mục có cờ từ chối/chờ duyệt */
const attLeave=(x,s)=>((META[skey(x)]||{}).leaves||[]).some(l=>{
 if(l&&typeof l==='object'&&(l.ok===false||l.approved===false||/tu choi|cho duyet|pending|reject/.test(nz(l.status||''))))return false;
 const D=parseDMY(typeof l==='string'?l:l&&l.d);return !!D&&isoD(D)===s});

/* --- Tải / dựng dữ liệu --- */
async function attLoad(force){
 if(!force&&AT.ld===AT.date)return true;
 const mo=AT.date.slice(0,7);AT.err='';
 if(!OK){AT.err='Chưa cấu hình kết nối Google Drive (API).';AT.rows=[];AT.ld=AT.date;return false}
 try{const r=await api({action:'loadAttend'},{pin:attPin(),from:mo+'-01',to:mo+'-31'});
  if(r&&r.error){if(r.error==='pin')return attPinBad();AT.err=r.error==='action'?'Máy chủ chưa cập nhật Apps Script (thiếu action loadAttend).':'Lỗi tải điểm danh: '+r.error;AT.rows=[];AT.ld=AT.date;return false}
  AT.rows=(r.rows||[]).map(a=>({d:a[0],s:a[1],room:a[2],k:a[3],n:a[4],st:a[5],note:a[6],by:a[7],at:a[8]}));AT.ld=AT.date;return true}
 catch(e){AT.err='Không kết nối được máy chủ: '+e.message;AT.rows=[];AT.ld=AT.date;return false}}
function attBuild(){
 const idx={};AT.rows.forEach(r=>{if(r.d===AT.date&&r.s===AT.s)idx[r.k]=r});AT.cur={};
 attRoster(AT.date,AT.s).forEach(e=>{const r=idx[e.k];
  if(r)AT.cur[e.k]={s:r.st,note:r.note||''};
  else if(attLeave(e.x,AT.date))AT.cur[e.k]={s:'E',note:'Nghỉ phép đã duyệt',sug:true}})}   // gợi ý, lưu khi bấm Lưu
function attStat(){const m={};AT.rows.forEach(r=>{const o=m[r.k]||(m[r.k]={P:0,L:0,E:0,U:0});if(o[r.st]!=null)o[r.st]++});return m}
/* Chuyên cần = (Có mặt + Trễ) / (Có mặt + Trễ + Vắng không phép); vắng có phép không tính vào mẫu số */
const pct=o=>{if(!o)return null;const d=o.P+o.L+o.U;return d?Math.round((o.P+o.L)/d*100):null};
const rtCol=p=>p>=90?'#15803d':p>=80?'#b45309':'#d92550';

/* --- Giao diện --- */
function attBar(){const b=$('#att-bar');if(!b)return;const d=dateOf(AT.date);
 b.innerHTML=`<div class="card no-print"><div class="card-body d-flex flex-wrap align-items-center" style="gap:8px">
 <button class="btn btn-soft" id="att-prev" aria-label="Ngày trước"><i class="fas fa-chevron-left"></i></button>
 <input type="date" class="form-control" style="width:auto" id="att-date" value="${AT.date}" aria-label="Ngày điểm danh">
 <button class="btn btn-soft" id="att-next" aria-label="Ngày sau"><i class="fas fa-chevron-right"></i></button>
 <button class="btn btn-soft" id="att-today">Hôm nay</button>
 <div class="btn-group" role="group" aria-label="Buổi">${[['S','Sáng'],['C','Chiều']].map(([k,l])=>`<button type="button" class="btn ${AT.s===k?'btn-primary':'btn-soft'}" data-ss="${k}" aria-pressed="${AT.s===k}">${l}</button>`).join('')}</div>
 <span class="text-muted">${WDN[d.getDay()]} ${dmyS(AT.date)} · phân phòng: ${TABS[dayTab(AT.date)]}</span>
 <input class="form-control ml-auto" style="max-width:200px" id="att-who" placeholder="Người điểm danh" value="${esc(AT.who)}" aria-label="Người điểm danh">
 <button class="btn btn-soft" id="att-reload" aria-label="Tải lại dữ liệu"><i class="fas fa-sync"></i></button>
 <button class="btn btn-primary" id="att-aiopen"><i class="fas fa-robot"></i> Trợ lý AI</button></div></div>`}
function attDirty(b){AT.dirty=!!b;const d=$('#att-dirty');if(d){d.textContent=AT.dirty?'● Có thay đổi chưa lưu':'Đã đồng bộ';d.style.color=AT.dirty?'#d92550':''}
 window.onbeforeunload=AT.dirty?(e=>{e.preventDefault();e.returnValue=''}):null}
function attDraw(){
 const sum=$('#att-sum'),g=$('#att-grid');if(!g)return;
 const L=attRoster(AT.date,AT.s),st=attStat(),mo=AT.date.slice(5,7)+'/'+AT.date.slice(0,4),cnt={P:0,L:0,E:0,U:0,N:0};
 L.forEach(e=>{const c=AT.cur[e.k];c&&c.s?cnt[c.s]++:cnt.N++});
 let mp=0,md=0;L.forEach(e=>{const o=st[e.k];if(o){mp+=o.P+o.L;md+=o.P+o.L+o.U}});
 const W=(ic,c,n,l)=>`<div class="col-6 col-md-4 col-xl-2"><div class="card widget"><div class="wi ${c}"><i class="fas ${ic}"></i></div><div><div class="wn">${n}</div><div class="wl">${l}</div></div></div></div>`;
 sum.innerHTML=`<div class="row">${W('fa-check','s-ok',cnt.P,'Có mặt')}${W('fa-clock','s-wa',cnt.L,'Trễ')}${W('fa-envelope-open','s-in',cnt.E,'Vắng có phép')}${W('fa-user-times','s-no',cnt.U,'Vắng không phép')}${W('fa-hourglass-half','s-pr',cnt.N,'Chưa điểm danh')}${W('fa-percentage','s-ok',md?Math.round(mp/md*100)+'%':'—','Chuyên cần tháng '+mo)}</div>
 <div class="card no-print"><div class="card-body d-flex flex-wrap align-items-center" style="gap:8px"><b>Cả buổi:</b>${AK.map(s=>`<button type="button" class="ab sm ${s}" data-bulk="${s}" data-scope="all"><i class="fas ${AST[s].ic}"></i>${AST[s].f} tất cả</button>`).join('')}<button type="button" class="ab sm" data-bulk="" data-scope="all">Xóa chọn</button><label class="mb-0 ml-auto"><input type="checkbox" id="att-ow"> Ghi đè cả người đã chọn</label></div></div>`;
 const row=e=>{const c=AT.cur[e.k]||{},p=pct(st[e.k]),o=st[e.k]||{P:0,L:0,E:0,U:0},
  rate=p==null?'<span class="rt text-muted">—</span>':`<span class="rt" style="background:${rtCol(p)}22;color:${rtCol(p)}" title="Tháng ${mo}: Có mặt ${o.P} · Trễ ${o.L} · Có phép ${o.E} · Không phép ${o.U}">Chuyên cần ${p}%</span>`;
  return `<div class="arow"><div class="nm"><b>${esc(role(e.x)+' '+e.x.n)}</b>${e.note?` <small class="text-muted">${esc(e.note)}</small>`:''}${c.sug?' <span class="sugt">gợi ý: nghỉ phép đã duyệt</span>':''}<div>${rate}</div></div>
  <div class="bt">${AK.map(s=>`<button type="button" class="ab ${s} ${c.s===s?'on':''}" data-st="${s}" data-k="${esc(e.k)}" aria-pressed="${c.s===s}" aria-label="${AST[s].f} – ${esc(e.x.n)}"><i class="fas ${AST[s].ic}"></i>${AST[s].l}</button>`).join('')}</div>
  ${c.s&&c.s!=='P'?`<input class="form-control form-control-sm" style="max-width:200px" data-note="${esc(e.k)}" placeholder="Ghi chú / lý do" value="${esc(c.note||'')}" aria-label="Ghi chú">`:''}</div>`};
 const cards=RAI.map(([id,name])=>{const es=L.filter(e=>e.room===id);if(!es.length)return'';const rc={P:0,L:0,E:0,U:0,N:0};es.forEach(e=>{const c=AT.cur[e.k];c&&c.s?rc[c.s]++:rc.N++});
  return `<div class="card"><div class="card-header"><span>${esc(name)} <span class="badge badge-pill bg-ok">${es.length}</span></span><span class="text-muted" style="font-size:12px;font-weight:400;text-transform:none">CM ${rc.P} · Trễ ${rc.L} · Phép ${rc.E} · KP ${rc.U} · Chưa ${rc.N}</span></div><div class="card-body pt-2"><div class="d-flex flex-wrap align-items-center no-print" style="gap:6px"><small class="text-muted">Cả phòng:</small>${AK.map(s=>`<button type="button" class="ab sm ${s}" data-bulk="${s}" data-scope="${esc(id)}">${AST[s].l}</button>`).join('')}<button type="button" class="ab sm" data-bulk="" data-scope="${esc(id)}">Xóa</button></div>${es.map(row).join('')}</div></div>`}).join('');
 g.innerHTML=(AT.err?`<div class="alert alert-warning">${esc(AT.err)}</div>`:'')+(cards||`<div class="alert alert-primary">Chưa có học viên được phân phòng cho ${WDN[dateOf(AT.date).getDay()]} (tab “${TABS[dayTab(AT.date)]}”) ở buổi ${sesName(AT.s)}. Vào <a href="#/phanphong">Danh sách phân phòng</a>, chọn đúng tab rồi kéo học viên vào phòng.</div>`)}

/* --- Thao tác --- */
function setSt(k,s){
 const c=AT.cur[k]||{};AT.cur[k]=c.s===s?{s:'',note:'',touched:true}:{s,note:s==='P'?'':(c.note||''),touched:true};
 attDirty(true);const y=scrollY;attDraw();scrollTo(0,y);
 const b=$$('[data-st]').find(x=>x.dataset.k===k&&x.dataset.st===s);if(b)b.focus({preventScroll:true})}
function bulk(scope,st){
 const L=attRoster(AT.date,AT.s).filter(e=>scope==='all'||e.room===scope),ow=($('#att-ow')||{}).checked,snap=JSON.stringify(AT.cur);let n=0;
 L.forEach(e=>{const c=AT.cur[e.k];
  if(st===''){if(c&&c.s){AT.cur[e.k]={s:'',note:'',touched:true};n++}return}
  if(!c||!c.s||ow){AT.cur[e.k]={s:st,note:st==='P'?'':(c&&c.note)||'',touched:true};n++}});
 if(!n)return toast(st===''?'Không có học viên nào đã được chọn.':'Tất cả đã được chọn; tích “Ghi đè” nếu muốn thay đổi.',1);
 attDirty(true);attDraw();
 audit('Điểm danh hàng loạt ('+(scope==='all'?'cả buổi':'phòng '+scope)+', '+dmyS(AT.date)+' '+sesName(AT.s)+'): '+(st?AST[st].f:'xóa chọn')+' – '+n+' học viên (chưa lưu)');
 toast('Đã cập nhật '+n+' học viên (chưa lưu)',0,()=>{AT.cur=JSON.parse(snap);attDirty(true);attDraw()})}
async function attGo(date,s,force){
 const nd=date||AT.date,ns=s||AT.s;
 if(AT.dirty&&(nd!==AT.date||ns!==AT.s||force)){
  if(!await ask({title:'Thay đổi chưa lưu',msg:'Buổi hiện tại có thay đổi chưa lưu. Bỏ thay đổi và tiếp tục?',ok:'Bỏ thay đổi'})){attBar();return}}
 AT.date=nd;AT.s=ns;
 if(force||nd!==AT.ld){$('#att-grid').innerHTML=skeleton();await attLoad(true)}
 attBuild();attBar();attDirty(false);attDraw()}
const shiftDay=n=>{const d=dateOf(AT.date);d.setDate(d.getDate()+n);return isoD(d)};
async function attDiscard(){if(!AT.dirty)return;if(!await ask({title:'Hủy thay đổi',msg:'Khôi phục lưới điểm danh về dữ liệu đã lưu?',ok:'Hủy thay đổi'}))return;attBuild();attDirty(false);attDraw()}
async function attSave(){
 const L=attRoster(AT.date,AT.s),recs=[];
 L.forEach(e=>{const c=AT.cur[e.k];if(c&&(c.touched||c.sug))recs.push({room:e.room,k:e.k,n:e.x.n,s:c.s||'',note:(c.s&&c.s!=='P'?c.note:'')||''})});
 if(!recs.length)return toast('Chưa có thay đổi nào để lưu',1);
 if(!OK)return toast('Chưa cấu hình kết nối Google Drive (API)',1);
 const btn=$('#att-save');btn.disabled=true;
 try{
  const r=await api({action:'saveAttend'},{pin:attPin(),date:AT.date,session:AT.s,records:recs,who:AT.who});
  if(r.error){if(r.error==='pin')return attPinBad();throw new Error(r.error==='action'?'Máy chủ chưa cập nhật Apps Script (thiếu action saveAttend)':r.error)}
  const ks={};recs.forEach(x=>ks[x.k]=1);
  AT.rows=AT.rows.filter(x=>!(x.d===AT.date&&x.s===AT.s&&ks[x.k]));
  const by=ADM?'Quản trị viên':'Nhân viên khoa',at=new Date().toLocaleString('vi-VN');
  recs.forEach(x=>{if(x.s)AT.rows.push({d:AT.date,s:AT.s,room:x.room,k:x.k,n:x.n,st:x.s,note:x.note,by,at})});
  L.forEach(e=>{const c=AT.cur[e.k];if(c){c.touched=false;c.sug=false}});
  const cn={P:0,L:0,E:0,U:0};recs.forEach(x=>{if(cn[x.s]!=null)cn[x.s]++});
  audit('Lưu điểm danh '+dmyS(AT.date)+' '+sesName(AT.s)+': '+recs.length+' bản ghi (CM '+cn.P+', Trễ '+cn.L+', Phép '+cn.E+', KP '+cn.U+')'+(AT.who?' – người ghi: '+AT.who:''));
  toast('Đã lưu điểm danh lên Drive');attDirty(false);attDraw()}
 catch(e){toast('Chưa lưu được: '+e.message,1)}
 finally{btn.disabled=false}}

/* --- Trợ lý AI: tên học viên ẩn danh trước khi gửi (chỉ gửi mã H#, vai trò, phòng, ca) --- */
function attNames(x){const t=x.n.trim().split(/\s+/),v=[x.n];if(t.length>=3)v.push(t.slice(-2).join(' '));
 const one=t[t.length-1],f=fold(one).toLowerCase();if(one.length>=2&&f!=='sang'&&f!=='chieu')v.push(one);return v}   // tên đơn “Sáng/Chiều” trùng từ khóa buổi → dùng họ tên đầy đủ
function maskAtt(text,L){
 const orig=text.normalize('NFC'),f=fold(orig).toLowerCase(),g={};
 students.forEach(x=>{const i=L.findIndex(e=>e.k===skey(x)),id=i>=0?'H'+(i+1):'K'+(students.indexOf(x)+1);   // K# = học viên không thuộc buổi này
  attNames(x).forEach(n=>{const q=fold(n).toLowerCase().trim();if(q.length>=2)(g[q]=g[q]||[]).push(id)})});
 const hits=[];
 Object.keys(g).sort((a,b)=>b.length-a.length).forEach(n=>{
  const re=new RegExp('(^|[^a-z0-9])('+n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s+')+')(?![a-z0-9])','g');let m;
  while((m=re.exec(f))){const a=m.index+m[1].length,b=a+m[2].length;if(!hits.some(h=>a<h.b&&b>h.a))hits.push({a,b,t:'học viên '+[...new Set(g[n])].join(' hoặc ')})}});
 hits.sort((x,y)=>y.a-x.a);let out=orig;hits.forEach(h=>{out=out.slice(0,h.a)+h.t+out.slice(h.b)});return out}
async function attAI(){
 const o=$('#att-aio'),raw=($('#att-aiq').value||'').trim();if(!raw)return;
 const f=fold(maskAtt(raw,[])).toLowerCase(),ms=/(^|[^a-z])sang([^a-z]|$)/.test(f),mc=/(^|[^a-z])chieu([^a-z]|$)/.test(f);
 if(ms!==mc){const want=ms?'S':'C';if(want!==AT.s){
  if(AT.dirty){o.innerHTML='<p class="text-danger">Yêu cầu nhắc buổi '+sesName(want)+' nhưng buổi hiện tại có thay đổi chưa lưu. Hãy lưu hoặc hủy thay đổi rồi thử lại.</p>';return}
  AT.s=want;attBuild();attBar();attDirty(false);attDraw()}}
 const L=attRoster(AT.date,AT.s);
 if(!L.length){o.innerHTML='<p class="text-muted">Chưa có học viên trong buổi này.</p>';return}
 o.innerHTML='<span class="text-muted">Đang hỏi trợ lý AI…</span>';
 try{
  const rs=RAI.filter(([id])=>L.some(e=>e.room===id));
  const r=await api({action:'aiAttend'},{pin:attPin(),text:maskAtt(raw,L),session:AT.s,date:dmyS(AT.date),rooms:rs.map(([id,name])=>({id,name})),students:L.map((e,i)=>({id:'H'+(i+1),role:role(e.x),room:e.room,ca:caOf(e.note)}))});
  if(r.error){if(r.error==='pin')return attPinBad();throw new Error(r.error==='action'?'Máy chủ chưa cập nhật Apps Script (thiếu action aiAttend)':r.error)}
  audit('Dùng trợ lý AI điểm danh ('+dmyS(AT.date)+' '+sesName(AT.s)+')');
  const prop=JSON.parse(JSON.stringify(AT.cur)),lines=[];let nFill=0;
  if(r.fill)L.forEach(e=>{if(r.fill.rooms.indexOf('all')>=0||r.fill.rooms.indexOf(e.room)>=0){const c=prop[e.k];if(!c||!c.s){prop[e.k]={s:r.fill.status,note:'',touched:true};nFill++}}});   // chỉ điền người chưa chọn
  (r.changes||[]).forEach(c=>{const e=L[+String(c.id).slice(1)-1];if(!e)return;const lv=attLeave(e.x,AT.date);
   let s=c.status;if(s==='A')s=lv?'E':'U';   // “vắng” không nói rõ: có nghỉ phép đã duyệt → Có phép, ngược lại → Không phép
   const note=s==='P'?'':(c.note||(s==='E'&&lv?'Nghỉ phép đã duyệt':''));prop[e.k]={s,note,touched:true};lines.push({e,s,note})});
  const nm=Object.fromEntries(RAI),rooms=r.fill?(r.fill.rooms.indexOf('all')>=0?'tất cả phòng':r.fill.rooms.map(x=>nm[x]).join(', ')):'';
  if(!lines.length&&!nFill){o.innerHTML=`<p class="text-muted">Không có thay đổi nào được đề xuất.</p><p class="text-muted">${esc(r.note||'')}</p>`;return}
  AT.prop=prop;
  o.innerHTML=`<div class="alert alert-info mb-2">${WDN[dateOf(AT.date).getDay()]} ${dmyS(AT.date)} · buổi ${sesName(AT.s)}</div>`+
   (nFill?`<p>Điền <b>${AST[r.fill.status].f}</b> cho <b>${nFill}</b> học viên chưa chọn (${esc(rooms)}).</p>`:'')+
   (lines.length?`<div class="ov"><table class="tbl"><tr><th>Học viên</th><th>Phòng</th><th>Trạng thái</th></tr>${lines.map(l=>`<tr><td>${esc(role(l.e.x)+' '+l.e.x.n)}</td><td>${esc(l.e.rname)}</td><td><b>${AST[l.s].f}</b>${l.note?' · '+esc(l.note):''}</td></tr>`).join('')}</table></div>`:'')+
   `<button class="btn btn-primary mt-2" id="att-apply">Áp dụng vào lưới</button><p class="text-muted mt-2">${esc(r.note||'')}</p>`;
  $('#att-apply').onclick=()=>{const snap=JSON.stringify(AT.cur);AT.cur=AT.prop;attDirty(true);attDraw();
   audit('Áp dụng điểm danh do trợ lý AI đề xuất ('+dmyS(AT.date)+' '+sesName(AT.s)+'): '+lines.length+' thay đổi, điền '+nFill+' (chưa lưu)');
   o.innerHTML='';toast('Đã điền vào lưới. Kiểm tra rồi bấm “Lưu điểm danh”.',0,()=>{AT.cur=JSON.parse(snap);attDirty(true);attDraw()})}}
 catch(e){o.innerHTML=`<p class="text-danger">${esc(e.message)}</p>`}}

/* --- Trang #/diemdanh --- */
R.attend=async()=>{
 if(!attPin()&&!(await attLogin()))return location.hash='#/';
 head('fa-user-check','Điểm danh','Theo ngày, buổi và phòng · '+(ADM?'Quản trị viên':'Nhân viên khoa'));
 view.innerHTML=crumb('',STF?'<button class="btn btn-soft" id="att-out"><i class="fas fa-sign-out-alt"></i> Thoát</button>':'')+
 `<div id="att-root"><div id="att-bar"></div>
 <div class="card no-print" id="att-aip" hidden><div class="card-header">Trợ lý AI – điểm danh hàng loạt <span class="badge badge-pill bg-ok">Gemini</span></div><div class="card-body"><p class="text-muted">Tên học viên được ẩn danh trước khi gửi AI (chỉ gửi mã H1, H2…, vai trò, phòng). Ví dụ: “Phòng 208 sáng vắng KTV Hùng, BS Châu”; “Cả phòng 207A có mặt, Mỹ Tú trễ”; “Phòng 6.216 chiều vắng có phép Thư”. AI chỉ đề xuất: bạn xem, bấm Áp dụng rồi bấm Lưu điểm danh.</p><textarea id="att-aiq" rows="2" class="form-control mb-2" placeholder="Nhập yêu cầu…"></textarea><button class="btn btn-primary" id="att-aib">Hỏi trợ lý</button><div id="att-aio" class="mt-3"></div></div></div>
 <div id="att-sum"></div><div id="att-grid">${skeleton()}</div>
 <div class="card att-sticky no-print"><div class="card-body d-flex align-items-center" style="gap:10px"><span id="att-dirty" class="text-muted flex-fill"></span><button class="btn btn-soft" id="att-disc">Hủy thay đổi</button><button class="btn btn-primary" id="att-save"><i class="fas fa-save"></i> Lưu điểm danh</button></div></div></div>`;
 const out=$('#att-out');if(out)out.onclick=()=>{audit('Nhân viên khoa thoát','Nhân viên khoa');STF='';try{sessionStorage.removeItem('vltl_stf')}catch(e){}toast('Đã thoát');location.hash='#/'};
 const root=$('#att-root');
 root.addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;
  if(t.dataset.st)return setSt(t.dataset.k,t.dataset.st);
  if(t.dataset.bulk!==undefined&&t.dataset.scope)return bulk(t.dataset.scope,t.dataset.bulk);
  if(t.dataset.ss)return attGo(null,t.dataset.ss);
  switch(t.id){
   case'att-prev':return attGo(shiftDay(-1));case'att-next':return attGo(shiftDay(1));case'att-today':return attGo(isoD(new Date()));
   case'att-reload':return attGo(null,null,true);case'att-save':return attSave();case'att-disc':return attDiscard();
   case'att-aiopen':{const p=$('#att-aip');p.hidden=!p.hidden;if(!p.hidden)$('#att-aiq').focus();return}
   case'att-aib':return attAI()}});
 root.addEventListener('change',e=>{if(e.target.id==='att-date'&&e.target.value)attGo(e.target.value)});
 root.addEventListener('input',e=>{const t=e.target;
  if(t.id==='att-who'){AT.who=t.value.slice(0,60);SV('vltl_att_who',AT.who);return}
  if(t.hasAttribute&&t.hasAttribute('data-note')){const c=AT.cur[t.dataset.note];if(c){c.note=t.value;c.touched=true;attDirty(true)}}});
 attBar();attDirty(false);
 await attLoad(true);attBuild();attBar();attDraw()};
/* ===================== HẾT ĐIỂM DANH ===================== */

/* ===== Router (hash) — #/doituong/1, #/thi/1/0 … ===== */
function showErr(e){console.error(e);view.innerHTML=`<div class="alert alert-danger"><b>Lỗi hiển thị:</b> ${esc(e&&e.message||e)}<br><small>Nhấn Ctrl+F5 để tải lại. Nếu vẫn lỗi, chụp dòng này gửi người phát triển.</small></div>`}
function route(){const h=location.hash.replace(/^#\/?/,''),[path,qs]=h.split('?'),[p,a,b]=path.split('/'),n=v=>v===undefined?0:+v;
 const m={'':()=>R.home(),noiquy:()=>R.rules(),phanphong:()=>R.rooms(),doituong:()=>R.subj(n(a)),kythuat:()=>R.tech(n(a),0,qs&&decodeURIComponent(qs.replace(/^q=/,''))),bangkiem:()=>R.bk(n(a)),ontap:()=>R.rev(n(a)),thi:()=>R.exam(n(a),n(b)),quantri:()=>R.admin(a),diemdanh:()=>R.attend()};
 clearInterval(S.tm);document.body.classList.remove('open');window.scrollTo(0,0);
 buildMenu();const cur='#/'+p+((p==='doituong'||(p==='quantri'&&a))?'/'+a:'');$$('#menu a').forEach(x=>x.classList.toggle('on',x.dataset.h===cur));
 try{Promise.resolve((m[p]||m[''])()).catch(showErr)}catch(e){showErr(e)}view.focus({preventScroll:true})}
addEventListener('hashchange',route);

/* ===== Khởi động: skeleton → tải dữ liệu → hiển thị ===== */
route();
pull().catch(()=>{}).finally(()=>{if(!S.tm&&!/^#\/thi/.test(location.hash)&&(ADM||(!/^#\/quantri/.test(location.hash)&&(STF||!/^#\/diemdanh/.test(location.hash)))))route();flush();bellUpdate()});
setInterval(()=>{if(document.visibilityState==='visible'&&OK&&!S.tm&&!DRAG&&Date.now()>RM_LOCK&&!document.querySelector('.md')&&/^#\/(doituong|phanphong)/.test(location.hash))pull().then(route)},30000);
})();
