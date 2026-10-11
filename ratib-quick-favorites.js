/* Ratib quick favorites and shared output controls — additive, no accounting data changes. */
(()=>{'use strict';
const KEY='ratib.quickFavorites.v1';
const choices=[
['pageExpenses','إضافة سند','🧾'],['pageLedger','سجل العمليات','📒'],
['pageReports','التقارير','📊'],['pageAccountsTree','الحسابات','📁'],
['pageAccountOperations','كشف الحساب','📑'],['pageSettings','الإعدادات','⚙️']
];
const byId=Object.fromEntries(choices.map(x=>[x[0],x]));
let selected=[];
try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(v))selected=[...new Set(v)].filter(x=>byId[x]);}catch(_){}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(selected));}catch(e){console.warn('تعذر حفظ المفضلة',e);}};
const css=document.createElement('style');css.textContent=`
.ratib-quick-btn{font-size:1.15rem!important;min-width:38px;min-height:38px}
#ratibFavoritesPanel{position:fixed;inset:0;z-index:99990;background:rgba(15,23,42,.56);display:none;align-items:center;justify-content:center;padding:16px}
#ratibFavoritesPanel.open{display:flex}
#ratibFavoritesPanel .fav-box{background:var(--card,#fff);color:var(--text,#111);width:min(520px,100%);max-height:85vh;overflow:auto;border-radius:16px;padding:18px;box-shadow:0 12px 45px #0004}
#ratibFavoritesPanel .fav-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px}
#ratibFavoritesPanel .fav-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
#ratibFavoritesPanel .fav-item{border:1px solid var(--border,#ddd);border-radius:12px;padding:10px;background:var(--bg,#fafafa);color:var(--text,#111);text-align:right;cursor:pointer;font:inherit}
#ratibFavoritesPanel .fav-row{display:flex;align-items:center;justify-content:space-between;gap:6px}
#ratibFavoritesPanel .fav-small{border:1px solid var(--border,#ddd);background:var(--card,#fff);color:var(--text,#111);border-radius:8px;padding:5px 8px;cursor:pointer}
#ratibFavoritesPanel .fav-section{margin:16px 0 8px;font-weight:bold}
@media print{#ratibFavoritesPanel,.ratib-quick-btn{display:none!important}
table{border-collapse:collapse}thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}
.no-print{display:none!important}}
`;document.head.appendChild(css);
const panel=document.createElement('div');panel.id='ratibFavoritesPanel';panel.className='no-print';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','المفضلة السريعة');
panel.innerHTML='<div class="fav-box"><div class="fav-head"><strong>⭐ المفضلة السريعة</strong><button type="button" class="fav-small" data-close aria-label="إغلاق">✕ إغلاق</button></div><div id="ratibFavItems"></div><div class="fav-section">إضافة اختصارات</div><div id="ratibFavOptions" class="fav-grid"></div></div>';
document.body.appendChild(panel);
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(){
document.getElementById('ratibFavItems').innerHTML=selected.length?'<div class="fav-grid">'+selected.map((id,i)=>{const a=byId[id];return '<div class="fav-item"><button type="button" class="fav-item" style="width:100%" data-go="'+id+'">'+a[2]+' '+escapeHtml(a[1])+'</button><div class="fav-row"><button class="fav-small" data-up="'+id+'" '+(i===0?'disabled':'')+'>↑</button><button class="fav-small" data-down="'+id+'" '+(i===selected.length-1?'disabled':'')+'>↓</button><button class="fav-small" data-remove="'+id+'">حذف</button></div></div>';}).join('')+'</div>':'<p>لا توجد مفضلة بعد. اختر من الوظائف أدناه.</p>';
document.getElementById('ratibFavOptions').innerHTML=choices.filter(x=>!selected.includes(x[0])).map(x=>'<button type="button" class="fav-item" data-add="'+x[0]+'">'+x[2]+' '+escapeHtml(x[1])+' ＋</button>').join('')||'<p>أضفت جميع الاختصارات المتاحة.</p>';
}
function close(){panel.classList.remove('open');}
function open(){render();panel.classList.add('open');panel.querySelector('[data-close]').focus();}
panel.addEventListener('click',e=>{if(e.target===panel){close();return;}const b=e.target.closest('button');if(!b)return;const d=b.dataset;
if('close'in d){close();return;}
if(d.go){close();if(typeof window.navigateToTab==='function')window.navigateToTab(d.go,true);return;}
if(d.add){selected.push(d.add);}
if(d.remove){selected=selected.filter(x=>x!==d.remove);}
if(d.up||d.down){const id=d.up||d.down,i=selected.indexOf(id),j=i+(d.up?-1:1);if(j>=0&&j<selected.length)[selected[i],selected[j]]=[selected[j],selected[i]];}
save();render();
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&panel.classList.contains('open'))close();});
const actions=document.querySelector('header .header-actions');
if(actions){
const star=document.createElement('button');star.type='button';star.className='icon-btn ratib-quick-btn';star.textContent='☆';star.title='المفضلة السريعة';star.setAttribute('aria-label','فتح المفضلة السريعة');star.addEventListener('click',open);actions.prepend(star);
const exit=document.createElement('button');exit.type='button';exit.className='icon-btn ratib-quick-btn';exit.textContent='🚪';exit.title='الخروج';exit.setAttribute('aria-label','الخروج من التطبيق');exit.addEventListener('click',()=>{
if(!confirm('هل تريد الخروج من التطبيق؟ تأكد من حفظ التعديلات أولاً.'))return;
const editing=[...document.querySelectorAll('input,textarea,select')].some(el=>el.matches(':focus')&&!el.disabled);
if(editing&&!confirm('قد تكون هناك تعديلات لم تُحفظ. هل تريد المتابعة؟'))return;
close();const screen=document.createElement('div');screen.style.cssText='position:fixed;inset:0;z-index:999999;background:var(--bg,#fff);color:var(--text,#111);display:flex;align-items:center;justify-content:center;text-align:center;padding:24px';screen.innerHTML='<div><h2>تم الخروج من واجهة راتب</h2><p style="margin:16px 0">يمكنك إغلاق علامة التبويب أو العودة إلى التطبيق.</p><button id="ratibResumeApp" class="btn btn-primary" type="button">العودة إلى التطبيق</button></div>';document.body.appendChild(screen);screen.querySelector('button').onclick=()=>screen.remove();
});actions.append(exit);
}
const home=document.querySelector('#dashboardHomeContent');
if(home){const b=document.createElement('button');b.type='button';b.className='btn btn-ghost no-print';b.style.cssText='width:100%;margin:10px 0';b.textContent='⭐ المفضلة السريعة';b.onclick=open;home.prepend(b);}
window.RatibQuickFavorites={open,close};
})();

/* Load the approved unified output UI without touching accounting logic. */
(()=>{if(document.querySelector('script[data-ratib-unified-output]'))return;const s=document.createElement('script');s.src='./ratib-unified-output.js?v=3';s.defer=true;s.dataset.ratibUnifiedOutput='1';document.head.appendChild(s);})();
