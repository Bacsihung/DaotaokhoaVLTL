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
 if(c.status==='fulfilled'&&!c.value.error){const v=c.value;open=v.open||{};const mm=v.meta||{};META=mm.meta||{};REMOVED=mm.removed||[];EXTRA=mm.extra||[];if(v.students?.length&&!STU_SRC)STU_RAW=v.students;students=STU_RAW.concat(EXTRA).filter(x=>REMOVED.indexOf(skey(x))<0);if(v.rooms2&&Date.now()>RM_LOCK)ROOMS2=v.rooms2;SV('open',open);ERR=''}
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
const crumb=(extra='')=>`<div class="mb-3 no-print d-flex" style="gap:8px"><button class="btn btn-soft" onclick="history.back()" aria-label="Quay lại"><i class="fas fa-arrow-left"></i> Quay lại</button><a class="btn btn-soft" href="#/">Trang chủ</a>${extra}</div>`;

/* ===== Menu / điều hướng ===== */
const MENU=[['h','Menu chính'],['#/','Trang chủ','home'],['#/noiquy','Nội quy','rules'],['#/phanphong','Danh sách phân phòng','rooms'],
 ['h','Đối tượng thực hành'],...SUBJ.map((s,i)=>['#/doituong/'+i,s,'user']),['h','Quản trị'],['#/quantri','Quản trị viên','admin']];
const ADM_SUB=[['tong-quan','Tổng quan','fa-chart-pie'],['mo-thi','Mở thi và chọn đề','fa-door-open'],['vong-quay','Vòng quay bảng kiểm','fa-dice'],['ket-qua','Kết quả thi','fa-file-signature'],['hoc-vien','Danh sách học viên','fa-users'],['nhat-ky','Nhật ký thao tác','fa-history']];
function buildMenu(){$('#menu').innerHTML=MENU.map(m=>m[0]==='h'?`<h6>${m[1]}</h6>`:`<a href="${m[0]}" data-h="${m[0]}"><i class="fas ${ICON[m[2]]}" aria-hidden="true"></i><span>${m[1]}</span></a>`).join('')+(ADM?ADM_SUB.map(x=>`<a class="sub" href="#/quantri/${x[0]}" data-h="#/quantri/${x[0]}"><i class="fas ${x[2]}" aria-hidden="true"></i><span>${x[1]}</span></a>`).join(''):'')}
buildMenu();
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
 const W=(h,ic,cls,n,l)=>`<div class="col-md-6 col-xl-3"><a class="card widget link" href="${h}" style="text-decoration:none"><div class="wi ${cls}"><i class="fas ${ic}"></i></div><div><div class="wn">${n}</div><div class="wl">${l}</div></div></a></div>`;
 const ex=(LB[i]||[]).map((l,li)=>{const o=open[s+'|'+l],ok=o&&o.on;return `<div class="col-md-6"><div class="card ${ok?'link':''}" style="${ok?'':'opacity:.7'}" ${ok?`data-ex="${li}"`:''}><div class="card-body d-flex align-items-center" style="gap:12px"><div class="wi ${ok?'s-ok':'s-no'}"><i class="fas ${ok?'fa-pen':'fa-lock'}"></i></div><div><b>${esc(l)}</b><div class="text-muted">${ok?'Đã mở – Đề số '+o.set+' – nhấn để vào thi':ERR?'Lỗi kết nối máy chủ (F5 để thử lại)':'Chờ Quản trị viên mở'}</div></div></div></div></div>`}).join('')||'<div class="col-12"><div class="card"><div class="card-body text-muted">Chưa có bộ đề cho nhóm này.</div></div></div>';
 view.innerHTML=crumb()+`<div class="row">${W('#/kythuat/'+i,'fa-list','s-pr',TECH[i].length,'Kỹ thuật trong danh mục')}${W('#/bangkiem/'+i,'fa-clipboard-check','s-ok',bkFiles(i).length||8,'Bảng kiểm quy trình')}${W('#/ontap/'+i,'fa-question-circle','s-wa',KEYS[i].length*5,'Câu hỏi ôn tập')}${W('#/nghiphep/'+i,'fa-file-signature','s-in','Đơn','Xin nghỉ phép')}</div><h6 class="text-muted mb-3">THI KẾT THÚC THỰC HÀNH</h6><div class="row">${ex}</div>`;
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
const pendingCount=()=>LS('vltl_pending_results',[]).length+LS('vltl_pending_leaves',[]).length;
async function submit(){clearInterval(S.tm);const tot=S.qs.length,ok=S.qs.filter((q,k)=>S.ans[k]===q.a).length,sc=score(ok,tot);
 const r={n:S.st.n,d:S.st.d,t:S.t,ph:S.l,set:S.set,from:S.st.from||'',to:S.st.to||'',ok,tot,sc,at:new Date().toLocaleString('vi-VN'),qs:S.qs.map(q=>({q:q.q,o:q.o,a:q.a})),ans:S.ans};
 results.push(r);SV('res',results);audit('Nộp bài thi ('+r.t+', đề '+r.set+'): '+r.sc+'/10',r.n);
 view.innerHTML=`<div class="card" style="max-width:520px;margin:0 auto;text-align:center"><div class="card-header">Kết quả bài thi</div><div class="card-body"><div class="big">${sc}<small style="font-size:18px">/10</small></div><p>Số câu đúng: <b>${ok}/${tot}</b></p><div class="progress"><div class="progress-bar" style="width:${ok/tot*100}%"></div></div><p id="svst" class="text-muted mt-3">${OK?'Đang lưu bài làm lên Google Drive…':''}</p><a class="btn btn-primary" href="#/">Về trang chủ</a> <button class="btn btn-soft" id="dlp">Tải đề thi (Quản trị viên)</button></div></div>`;$('#dlp').onclick=()=>dlPin(results.length-1);
 if(!OK)return;try{const x=await api({action:'result'},{r:{...r,qs:undefined,ans:undefined},html:`<p>${esc(r.n)} — ${r.sc}/10 (${r.ok}/${r.tot})</p>`});if(x.error)throw new Error(x.error);$('#svst').textContent='Đã lưu bài làm và điểm lên Google Drive.';toast('Đã lưu kết quả lên Drive')}
 catch(e){const p=LS('vltl_pending_results',[]);p.push({r,at:Date.now()});SV('vltl_pending_results',p);$('#bellDot').hidden=false;$('#svst').textContent='Chưa gửi được lên Drive; đã lưu trên máy, sẽ thử lại.';toast('Chưa gửi được lên Drive. Đã lưu máy, sẽ thử lại sau.',1)}}
async function flush(){const q=LS('vltl_pending_results',[]);if(!q.length||!OK)return;const left=[];for(const it of q){try{const x=await api({action:'result'},{r:{...it.r,qs:undefined,ans:undefined},html:''});if(x.error)left.push(it)}catch(e){left.push(it)}}SV('vltl_pending_results',left);$('#bellDot').hidden=!left.length;if(left.length<q.length)toast('Đã đồng bộ '+(q.length-left.length)+' kết quả thi')}
addEventListener('online',flush);

/* ===== Quản trị ===== */
async function login(){const p=await ask({title:'Quản trị viên',msg:'Nhập mật khẩu để vào trang quản trị.',input:'password',ok:'Đăng nhập'});if(!p)return false;
 if(!OK){toast('Chưa cấu hình kết nối Google Drive (API)',1);return false}
 try{const r=await api({action:'auth'},{pin:p});if(r&&r.ok){ADM=p;try{sessionStorage.setItem('vltl_adm',p)}catch(e){}toast('Đã đăng nhập quản trị');buildMenu();audit('Đăng nhập quản trị');return true}audit('Đăng nhập quản trị thất bại','Không xác định');toast('Sai mật khẩu',1)}catch(e){toast('Không kết nối được máy chủ',1)}return false}
/* ===== Nhật ký thao tác (ai, làm gì, lúc nào) ===== */
document.head.insertAdjacentHTML('beforeend','<style>.ad-sec{scroll-margin-top:84px}.sb-scroll a.sub{height:36px;padding-left:34px;font-size:13px}</style>');
const AUD='vltl_audit',ADMIN_WHO='Quản trị viên (BS.CKI Trần Cồng Hùng)';
function audit(what,who){const e={t:new Date().toLocaleString('vi-VN'),w:who||(ADM?ADMIN_WHO:'Học viên'),a:what},L=LS(AUD,[]);L.push(e);SV(AUD,L.slice(-500));if(OK)api({action:'audit'},{entry:e}).catch(()=>{})}
const scrollSec=id=>{const el=document.getElementById('ad-'+id);if(el)el.scrollIntoView({behavior:'smooth',block:'start'})};
$('#menu').addEventListener('click',e=>{const a=e.target.closest('a.sub');if(a&&location.hash===a.dataset.h){e.preventDefault();scrollSec(a.dataset.h.split('/').pop());document.body.classList.remove('open')}});
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
 view.innerHTML=crumb()+`<section class="ad-sec" id="ad-tong-quan"><div class="row">${W('fa-users','s-pr',students.length,'Tổng học viên')}${W('fa-file-signature','s-in',ex.length,'Đã có bài thi')}${W('fa-check-circle','s-ok',pass,'Đạt (≥ 5 điểm)')}${W('fa-hourglass-half','s-wa',notYet.length,'Chưa thi')}</div></section>
 <section class="ad-sec" id="ad-mo-thi"><div class="card"><div class="card-header">Mở thi và chọn đề</div><div class="ov"><table class="tbl cards">${th(['Đối tượng','Mục thi','Mở','Đề số'])}<tbody>${oRows}</tbody></table></div><div class="card-body text-muted">Cách tính điểm: đúng 65% số câu → 5 điểm; phần còn lại chia đều đến 10.</div></div></section>
 <section class="ad-sec" id="ad-vong-quay"><div class="card"><div class="card-header">Vòng quay bảng kiểm QTKT – bật / tắt</div><div class="ov"><table class="tbl cards">${th(['Đối tượng','Số ô','Bật'])}<tbody>${wRows}</tbody></table></div><div class="card-body text-muted">Khi bật, học viên vào trang đối tượng sẽ thấy các ô quay số.</div></div></section>
 <section class="ad-sec" id="ad-ket-qua"><div class="card"><div class="card-header">Kết quả thi <span class="badge badge-pill bg-ok">${results.length}</span><span class="d-flex flex-wrap no-print" style="gap:6px"><button class="btn btn-soft btn-sm" data-x="0">Xuất Excel</button><button class="btn btn-soft btn-sm" data-xe="Bác sĩ">Mẫu Bác sĩ</button><button class="btn btn-soft btn-sm" data-xe="Cử nhân PHCN">Mẫu Cử nhân</button><button class="btn btn-soft btn-sm" data-xe="Y sĩ">Mẫu Y sĩ</button><button class="btn btn-soft btn-sm" onclick="print()">In</button></span></div><div class="ov"><table class="tbl cards">${th(['Học viên','Mục','Đề','Điểm',''])}<tbody>${results.map((r,i)=>[r,i]).slice(-30).reverse().map(([r,i])=>`<tr><td data-l="Học viên"><span class="av-sm">${esc(initials(r.n))}</span>${esc(r.n)}</td><td data-l="Mục">${esc(r.t)}${r.ph&&r.t==='Cử nhân PHCN'?' · '+esc(r.ph):''}</td><td data-l="Đề">${r.set||'—'}</td><td data-l="Điểm"><span class="badge badge-pill ${+r.sc>=5?'bg-ok':'bg-mut'}">${r.sc??'—'}</span>${r.tot?` (${r.ok}/${r.tot})`:''}</td><td class="no-print">${r.qs?`<button class="btn btn-soft btn-sm" data-dl="${i}">Tải đề</button> `:''}<button class="btn btn-soft btn-sm text-danger" data-del="${i}" aria-label="Xóa kết quả của ${esc(r.n)}"><i class="fas fa-trash"></i></button></td></tr>`).join('')||'<tr><td colspan="5" class="text-muted">Chưa có bài thi nào.</td></tr>'}</tbody></table></div></div></section>
 <section class="ad-sec" id="ad-hoc-vien"><div class="card"><div class="card-header">Danh sách học viên <span class="badge badge-pill bg-ok">${students.length}</span></div><div class="card-body pb-0"><p class="text-muted mb-2">Nguồn: ${STU_SRC?esc(STU_SRC):(STU_ERR?'lỗi: '+esc(STU_ERR):'dữ liệu máy chủ'+(OK?'':' (chưa kết nối)'))} · <a href="${SHEET}" target="_blank" rel="noopener">Mở Google Sheet DS học viên</a></p><details class="no-print"><summary class="text-muted" style="cursor:pointer">Nhập thêm từ Excel (tùy chọn)</summary><p class="text-muted mt-2">Cột: Họ tên | Ngày sinh | Từ ngày | Đến ngày | Phòng | Đối tượng</p><input type="file" id="imp" accept=".xlsx,.xls" aria-label="Chọn file Excel"></details></div><div class="ov"><table class="tbl cards">${th(['STT','Họ tên','Chức danh','Thời gian TH','Tổng ngày nghỉ','Ngày nghỉ (cụ thể)','Ngày bù',''])}<tbody>${sRows||'<tr><td colspan="8" class="text-muted">Chưa có học viên.</td></tr>'}</tbody></table></div></div></section>
 <section class="ad-sec" id="ad-nhat-ky"><div class="card"><div class="card-header">Nhật ký thao tác <span class="d-flex no-print"><button class="btn btn-soft btn-sm" id="lgx">Xuất Excel</button></span></div><div class="ov" style="max-height:420px;overflow:auto"><table class="tbl cards">${th(['Thời gian','Ai','Làm gì'])}<tbody>${lg.map(e=>`<tr><td data-l="Thời gian">${esc(e.t)}</td><td data-l="Ai">${esc(e.w)}</td><td data-l="Làm gì">${esc(e.a)}</td></tr>`).join('')||'<tr><td colspan="3" class="text-muted">Chưa có thao tác nào.</td></tr>'}</tbody></table></div><div class="card-body text-muted">Hiển thị 100 thao tác gần nhất (lưu tối đa 500 trên trình duyệt này${OK?'; đồng thời gửi lên máy chủ nếu Apps Script hỗ trợ action “audit”':''}).</div></div></section>
 <section class="ad-sec"><div class="card"><div class="card-header">Kiểm tra dữ liệu Google Drive <span class="badge badge-pill bg-ok">${FILES.length} file</span></div><div class="ov"><table class="tbl">${th(['Đối tượng','PDF QTKT','File bảng kiểm'])}<tbody>${SUBJ.map((s,i)=>`<tr><td>${s}</td><td>${subjFiles(i,'qtkt').length}</td><td>${subjFiles(i,'bang kiem',false).length}</td></tr>`).join('')}</tbody></table></div><div class="card-body"><p class="text-muted">Nội quy: ${nq.length?esc(nq[0].name):'chưa thấy'} · Đơn xin nghỉ phép: ${dn.length?esc(dn[0].name):'chưa thấy'}</p><button class="btn btn-soft" id="rl">Tải lại dữ liệu Drive</button></div></div></section>
 <section class="ad-sec" id="ad-phien"><div class="card" style="border-style:dashed"><div class="card-header">Phiên quản trị</div><div class="card-body"><p class="text-muted">Đang đăng nhập. Thoát khi không dùng nữa.</p><button class="btn btn-soft" id="lo"><i class="fas fa-sign-out-alt"></i> Thoát quản trị</button><div class="mt-3"><button class="btn btn-primary" id="aiopen" aria-expanded="false"><i class="fas fa-robot"></i> Trợ lý AI</button></div><div id="aipanel" class="mt-3" hidden><p class="text-muted">Ví dụ: “Mở PRETEST cho Cử nhân đề 3, đóng thi của Bác sĩ”. Trợ lý chỉ đề xuất; bạn bấm Áp dụng mới có hiệu lực. Không nhập họ tên hay ngày sinh.</p><textarea id="aiq" rows="2" class="form-control mb-2" placeholder="Nhập yêu cầu…"></textarea><button class="btn btn-primary" id="aib">Hỏi trợ lý</button><div id="aio" class="mt-3"></div></div></div></div></section>`;
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
R.rooms=()=>{if(ADM)RMD();head('fa-th-large','Danh sách phân phòng','Sơ đồ phòng và học viên theo từng ca','<button class="btn btn-primary no-print" onclick="print()"><i class="fas fa-print"></i> In</button>');
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
/* ===== Xin nghỉ phép (theo mẫu "SV DON XIN NGHI PHEP.docx" trong mục Nội quy) ===== */
const pad2=n=>String(n).padStart(2,'0'),
 fmtD=d=>pad2(d.getDate())+'/'+pad2(d.getMonth()+1)+'/'+d.getFullYear(),
 isoD=v=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(v||'');return m?new Date(+m[1],+m[2]-1,+m[3]):null},
 isoToday=()=>{const d=new Date();return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate())};

/* Danh sách ngày nghỉ (dd/mm/yyyy), tối đa 14 ngày liên tiếp */
function leaveDays(a,b){const s=isoD(a),e=isoD(b||a);if(!s||!e||e<s)return null;
 const o=[];for(const d=new Date(s);d<=e&&o.length<15;d.setDate(d.getDate()+1))o.push(fmtD(d));return o.length>14?null:o}

const LV_ROLES=[['bác sĩ','Bác sĩ'],['kỹ thuật viên','Cử nhân PHCN'],['y sĩ','Y sĩ']];

/* Nội dung đơn: giữ đúng bố cục mẫu của Phòng ĐT-NCKH-CĐT */
function leaveBody(f){const st=f.st||{},now=new Date(),dy=f.days,
 yr=(String(f.d).match(/(19|20)\d{2}/)||[''])[0]||f.d,
 when=dy.length===1?'ngày '+dy[0]:'từ ngày '+dy[0]+' đến ngày '+dy[dy.length-1]+' ('+dy.length+' ngày)',
 prac=(st.from||st.to)?'từ ngày '+(st.from||'………………')+' đến ngày '+(st.to||'………………'):'từ ngày ………………… đến ngày …………………',
 why=String(f.reason||'').trim().replace(/[.\s]+$/,''),
 roles=LV_ROLES.map(r=>r[1]===f.t?`<b style="border:1px solid #000;padding:0 5px">${r[0]}</b>`:r[0]).join(', '),
 back=f.back?esc(f.back):'……………………',mk=f.makeup?esc(f.makeup):'……………………';
 return `<p style="text-align:center;margin:0"><b>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</b></p><p style="text-align:center;margin:0"><b>Độc lập – Tự do – Hạnh phúc</b></p><h2 style="text-align:center;margin:14px 0">ĐƠN XIN NGHỈ PHÉP</h2>
<p><b>Kính gửi:</b> - Phòng ĐT-NCKH-CĐT<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;- Khoa: Vật lý trị liệu – Phục hồi chức năng</p>
<p>Tôi tên là: <b>${esc(f.n)}</b> &nbsp;&nbsp; Sinh năm: <b>${esc(yr)}</b></p>
<p>Đối tượng: ${roles}</p>
<p>Hiện đang thực hành tại Khoa: <b>VLTL – PHCN</b> &nbsp;&nbsp; Phòng: <b>${esc(f.room)}</b></p>
<p>Thời gian thực tập tại khoa ${esc(prac)}</p>
<p>Nay làm đơn này xin phép nghỉ <b>${esc(when)}</b>.</p>
<p>Lý do: ${esc(why)}.</p>
<p style="text-align:justify">Tôi cam kết sẽ trở lại thực hành vào ngày ${back}, thực hành bù vào ngày ${mk} theo sự phân công và sắp xếp của Khoa theo quy định và chấp hành nghiêm chỉnh nội quy bệnh viện.</p>
<p style="text-align:justify">Kính mong lãnh đạo Khoa VLTL – PHCN xem xét, chấp thuận và nhận xét cho tôi thời gian thực hành tại khoa trong thời gian tôi đi thực hành tại khoa.</p>
<p>Kính mong Phòng ĐT-NCKH-CĐT xem xét và chấp thuận.</p>
<p>Tôi xin chân thành cảm ơn!</p>
<table width="100%" style="border-collapse:collapse;margin-top:10px"><tr><td align="center" width="33%" valign="top"><b>Ý kiến Phòng ĐT-NCKH-CĐT</b></td><td align="center" width="33%" valign="top"><b>Ý kiến Lãnh đạo khoa</b></td><td align="center" width="34%" valign="top">TP.HCM, ngày ${pad2(now.getDate())} tháng ${pad2(now.getMonth()+1)} năm ${now.getFullYear()}<br><b>Người làm đơn</b><br><br><br><br>${esc(f.n)}</td></tr></table>`}

const leaveDoc=f=>`<html><head><meta charset="utf-8"><title>Đơn xin nghỉ phép</title><style>body{font-family:'Times New Roman';font-size:13pt;line-height:1.5}p{margin:6pt 0}</style></head><body>${leaveBody(f)}</body></html>`;

function findStuLeave(n,d){const a=students.find(s=>norm(s.n)===norm(n)&&norm(s.d)===norm(d));if(a)return a;
 const L=students.filter(s=>nz(s.n)===nz(n));return L.length===1?L[0]:null}

/* Ghi cục bộ META[skey].leaves = [{d,reason}] (máy chủ là nguồn chính, pull() sẽ ghi đè) */
function addLeaveLocal(f){const e=META[f.key]=META[f.key]||{},L=e.leaves=e.leaves||[];
 f.days.forEach(d=>{if(!L.some(l=>(typeof l==='string'?l:l.d)===d))L.push({d,reason:f.reason})})}

R.leave=(i,keep)=>{keep=keep||{};head('fa-file-signature','Xin nghỉ phép',SUBJ[i]);
 view.innerHTML=crumb()+`<div class="card" style="max-width:600px;margin:0 auto"><div class="card-header">Đơn xin nghỉ phép – ${esc(SUBJ[i])}</div><div class="card-body">
 <label for="ln">Họ và tên</label><input class="form-control mb-3" id="ln" maxlength="80" placeholder="Nguyễn Văn A" value="${esc(keep.n||'')}">
 <label for="ld">Ngày sinh</label><input class="form-control mb-3" id="ld" maxlength="10" placeholder="dd/mm/yyyy" value="${esc(keep.d||'')}">
 <label for="lr">Phòng đang thực hành</label><select class="form-control mb-3" id="lr"><option value="">— Chọn phòng —</option>${RAI.map(r=>`<option ${keep.room===r[1]?'selected':''}>${r[1]}</option>`).join('')}<option ${keep.room==='Khác'?'selected':''}>Khác</option></select>
 <div class="row"><div class="col-sm-6"><label for="lf">Ngày xin nghỉ</label><input type="date" class="form-control mb-3" id="lf" value="${esc(keep.from||isoToday())}"></div>
 <div class="col-sm-6"><label for="lt">Đến ngày <small class="text-muted">(nếu nghỉ nhiều ngày)</small></label><input type="date" class="form-control mb-3" id="lt" value="${esc(keep.to||'')}"></div></div>
 <label for="ly">Lý do</label><textarea class="form-control mb-3" id="ly" rows="3" maxlength="300" placeholder="Ví dụ: sốt, đau họng, có giấy hẹn khám…">${esc(keep.reason||'')}</textarea>
 <div class="row"><div class="col-sm-6"><label for="lb">Ngày trở lại thực hành <small class="text-muted">(không bắt buộc)</small></label><input class="form-control mb-3" id="lb" maxlength="30" placeholder="dd/mm/yyyy" value="${esc(keep.back||'')}"></div>
 <div class="col-sm-6"><label for="lm">Ngày thực hành bù <small class="text-muted">(không bắt buộc)</small></label><input class="form-control mb-3" id="lm" maxlength="60" placeholder="dd/mm/yyyy" value="${esc(keep.makeup||'')}"></div></div>
 <button class="btn btn-primary btn-block" id="lgo">Tạo đơn</button></div></div>`;
 $('#lgo').onclick=()=>{const n=$('#ln').value.trim().replace(/\s+/g,' '),d=$('#ld').value.trim(),room=$('#lr').value,from=$('#lf').value,to=$('#lt').value,reason=$('#ly').value.trim(),back=$('#lb').value.trim(),makeup=$('#lm').value.trim();
  if(!n||!d||!room||!from||!reason)return toast('Vui lòng nhập đủ họ tên, ngày sinh, phòng, ngày nghỉ và lý do.',1);
  const days=leaveDays(from,to);if(!days)return toast('Khoảng ngày nghỉ không hợp lệ (tối đa 14 ngày, “đến ngày” phải sau “ngày nghỉ”).',1);
  const st=findStuLeave(n,d);
  leavePreview(i,{n,d,room,from,to,reason,back,makeup,days,t:SUBJ[i],st,key:st?skey(st):n+'|'+d})}};

function leavePreview(i,f){head('fa-file-signature','Xin nghỉ phép',SUBJ[i]);
 view.innerHTML=crumb()+`<div class="card" style="max-width:760px;margin:0 auto"><div class="card-header">Xem lại đơn trước khi gửi</div><div class="card-body">
 <div class="mb-3" style="background:#fff;color:#000;padding:24px 28px;border:1px solid var(--bd);border-radius:8px;font-family:'Times New Roman',serif;font-size:15px;line-height:1.7;overflow-x:auto">${leaveBody(f)}</div>
 ${f.st?'':'<div class="alert alert-warning">Không tìm thấy bạn trong danh sách học viên (đối chiếu theo họ tên + ngày sinh). Đơn vẫn được lưu vào Drive nhưng ngày nghỉ có thể chưa hiện trong bảng của Quản trị viên.</div>'}
 <div class="d-flex flex-wrap" style="gap:8px"><button class="btn btn-primary" id="lsend"><i class="fas fa-cloud-upload-alt"></i> Gửi đơn &amp; lưu vào Drive</button><button class="btn btn-soft" id="ldl"><i class="fas fa-download"></i> Tải file (.doc)</button><button class="btn btn-soft ml-auto" id="led">← Sửa lại</button></div>
 <p id="lst" class="text-muted mt-3 mb-0"></p></div></div>`;
 $('#led').onclick=()=>R.leave(i,f);
 $('#ldl').onclick=()=>{audit('Tải file đơn xin nghỉ phép ('+f.days.join(', ')+')',f.n);
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([leaveDoc(f)],{type:'application/msword'}));
  a.download='Don_xin_nghi_'+fold(f.n).replace(/\W+/g,'_')+'_'+f.days[0].replace(/\//g,'-')+'.doc';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500)};
 $('#lsend').onclick=async()=>{const b=$('#lsend');b.disabled=true;addLeaveLocal(f);
  audit('Gửi đơn xin nghỉ phép ('+f.days.join(', ')+') – lý do: '+f.reason+' – phòng '+f.room,f.n);
  const pay={r:{key:f.key,n:f.n,d:f.d,t:f.t,room:f.room,days:f.days,reason:f.reason,at:new Date().toLocaleString('vi-VN')},html:leaveDoc(f)};
  try{if(!OK)throw new Error('Chưa cấu hình kết nối Drive');const x=await api({action:'leave'},pay);if(x.error)throw new Error(x.error);
   $('#lst').textContent='Đã lưu đơn vào Google Drive và ghi nhận ngày nghỉ.';toast('Đã gửi đơn xin nghỉ phép')}
  catch(e){const p=LS('vltl_pending_leaves',[]);p.push({...pay,at:Date.now()});SV('vltl_pending_leaves',p);$('#bellDot').hidden=false;
   $('#lst').textContent='Chưa gửi được lên Drive; đơn đã lưu trên máy và sẽ tự gửi lại khi có kết nối.';toast('Chưa gửi được lên Drive. Đã lưu máy, sẽ thử lại sau.',1)}}}

async function flushLeaves(){const q=LS('vltl_pending_leaves',[]);if(!q.length||!OK)return;const left=[];
 for(const it of q){try{const x=await api({action:'leave'},{r:it.r,html:it.html});if(x.error)left.push(it)}catch(e){left.push(it)}}
 SV('vltl_pending_leaves',left);$('#bellDot').hidden=!pendingCount();
 if(left.length<q.length)toast('Đã đồng bộ '+(q.length-left.length)+' đơn xin nghỉ phép')}
addEventListener('online',flushLeaves);

/* ===== Router (hash) — #/doituong/1, #/thi/1/0 … ===== */
function showErr(e){console.error(e);view.innerHTML=`<div class="alert alert-danger"><b>Lỗi hiển thị:</b> ${esc(e&&e.message||e)}<br><small>Nhấn Ctrl+F5 để tải lại. Nếu vẫn lỗi, chụp dòng này gửi người phát triển.</small></div>`}
function route(){const h=location.hash.replace(/^#\/?/,''),[path,qs]=h.split('?'),[p,a,b]=path.split('/'),n=v=>v===undefined?0:+v;
 const m={'':()=>R.home(),noiquy:()=>R.rules(),phanphong:()=>R.rooms(),doituong:()=>R.subj(n(a)),kythuat:()=>R.tech(n(a),0,qs&&decodeURIComponent(qs.replace(/^q=/,''))),bangkiem:()=>R.bk(n(a)),ontap:()=>R.rev(n(a)),thi:()=>R.exam(n(a),n(b)),quantri:()=>R.admin(a),nghiphep:()=>R.leave(n(a))};
 clearInterval(S.tm);document.body.classList.remove('open');window.scrollTo(0,0);
 buildMenu();const cur='#/'+p+((p==='doituong'||(p==='quantri'&&a))?'/'+a:'');$$('#menu a').forEach(x=>x.classList.toggle('on',x.dataset.h===cur));
 try{Promise.resolve((m[p]||m[''])()).catch(showErr)}catch(e){showErr(e)}view.focus({preventScroll:true})}
addEventListener('hashchange',route);

/* ===== Khởi động: skeleton → tải dữ liệu → hiển thị ===== */
route();
pull().catch(()=>{}).finally(()=>{if(!S.tm&&!/^#\/thi/.test(location.hash)&&(ADM||!/^#\/quantri/.test(location.hash)))route();flush();flushLeaves();$('#bellDot').hidden=!pendingCount()});
setInterval(()=>{if(document.visibilityState==='visible'&&OK&&!S.tm&&!DRAG&&Date.now()>RM_LOCK&&!document.querySelector('.md')&&/^#\/(doituong|phanphong)/.test(location.hash))pull().then(route)},30000);
})();
