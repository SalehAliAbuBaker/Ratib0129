/* Ratib 3.6.87 trial — quick-create a detailed ledger account in voucher selectors.
   Uses the canonical catalog's existing add/validation/persistence functions.
   Does not create a posting, alter voucher numbers, amounts, currencies or rates. */
(function () {
  'use strict';
  const modalId='ratibQuickAccountModal';
  const allowedIds=new Set(['inpDebitAcc','inpCreditAcc','inpEditDebitAcc','inpEditCreditAcc','inpMultiSourceAcc']);
  const normalized=text=>normalizeParentQuery(String(text||''));
  const isVoucherSelector=selector=>Boolean(selector?.input&&(allowedIds.has(selector.input.id)||
    (selector.input.id.startsWith('voucherAccount_')&&selector.input.closest('#multiVoucherLinesBody'))));
  let current=null,busy=false;

  function inputCurrency(selector){
    if(selector?.ratibExternal)return document.getElementById('rc-currency')?.value||
      (typeof getGlobalCurrency==='function'?getGlobalCurrency():'YER');
    const field=selector?.input;
    const row=field?.closest('#multiVoucherLinesBody tr');
    if(row)return row.querySelector('.multi-line-currency')?.value||'YER';
    if(field?.closest('#cashFlowCard'))return document.getElementById('voucherCurrencySelect')?.value||'YER';
    if(field?.id.startsWith('inpEdit'))return document.getElementById('editVoucherCurrency')?.value||'YER';
    return document.getElementById('multiVoucherBaseCurrency')?.value||
      (typeof getGlobalCurrency==='function'?getGlobalCurrency():'YER');
  }
  function accountExists(name){
    const n=normalized(name);
    return getCanonicalCatalog().some(x=>
      [x.main,x.group,x.sub,...(x.details||[]).map(d=>d[1])].some(label=>normalized(label)===n)
    );
  }
  function parentRows(){
    const seen=new Set(),rows=[];
    for(const item of getCanonicalCatalog()){
      const path=catalogSubKey(item);
      if(seen.has(path))continue;
      seen.add(path);
      rows.push({path,code:String(item.subCode||''),text:'['+item.subCode+'] '+item.main+' ← '+item.group+' ← '+item.sub});
    }
    return rows.sort((a,b)=>a.code.localeCompare(b.code,'en',{numeric:true}));
  }
  function currencies(){
    const base=[{code:'YER',name:'ريال يمني'},{code:'SAR',name:'ريال سعودي'},{code:'USD',name:'دولار أمريكي'}];
    const map=new Map(base.map(x=>[x.code,{...x,active:true}]));
    try{
      for(const row of store.get('currency_catalog_v1',[])||[]){
        if(row&&/^[A-Z]{3}$/.test(row.code))map.set(row.code,row);
      }
      for(const code of KNOWN_CURRENCIES)if(!map.has(code))map.set(code,{code,name:code,active:true});
    }catch(e){console.warn('Quick account currency catalog:',e);}
    return [...map.values()].filter(x=>x.active!==false);
  }
  function msg(text,warning=false){
    const node=document.getElementById('ratibQuickAccountStatus');
    if(!node)return;
    node.textContent=text||'';
    node.dataset.warning=warning?'true':'false';
  }
  function buildModal(){
    if(document.getElementById(modalId))return;
    const host=document.createElement('div');host.id=modalId;host.className='ratib-quick-account-modal';
    host.hidden=true;host.setAttribute('role','dialog');host.setAttribute('aria-modal','true');
    host.setAttribute('aria-labelledby','ratibQuickAccountTitle');
    const panel=document.createElement('div');panel.className='ratib-quick-account-panel';
    const heading=document.createElement('div');heading.className='ratib-quick-account-heading';
    const title=document.createElement('h3');title.id='ratibQuickAccountTitle';title.textContent='＋ إنشاء حساب تفصيلي سريع';
    const close=document.createElement('button');close.type='button';close.className='ratib-quick-close';close.textContent='×';close.setAttribute('aria-label','إغلاق إنشاء الحساب');close.onclick=cancel;
    heading.append(title,close);panel.append(heading);
    const form=document.createElement('form');form.id='ratibQuickAccountForm';form.noValidate=true;
    form.innerHTML=`
      <label>اسم الحساب الجديد<input id="ratibQuickAccountName" maxlength="140" autocomplete="off" required></label>
      <label>البحث عن الحساب الأب<input id="ratibQuickParentSearch" type="search" placeholder="بالاسم أو الرقم" autocomplete="off"></label>
      <label>الحساب التجميعي الأب<select id="ratibQuickAccountParent" required><option value="">اختر الحساب الأب...</option></select></label>
      <div class="ratib-quick-account-duo">
        <label>رقم الحساب<input id="ratibQuickAccountCode" inputmode="numeric" dir="ltr" maxlength="12" required></label>
        <label>العملة<select id="ratibQuickAccountCurrency" required></select></label>
      </div>
      <small class="ratib-quick-account-hint">حساب تفصيلي برصيد افتتاحي صفر، ولا ينشئ سندًا أو قيدًا ماليًا.</small>
      <div id="ratibQuickAccountSimilar" class="ratib-quick-similar" aria-live="polite"></div>
      <p id="ratibQuickAccountStatus" class="ratib-quick-account-status" role="status" aria-live="polite"></p>
      <div class="ratib-quick-account-actions">
        <button type="button" id="ratibQuickAccountCancel" class="btn btn-ghost">إلغاء</button>
        <button type="submit" id="ratibQuickAccountSave" class="btn btn-primary">حفظ واختيار الحساب</button>
      </div>`;
    panel.append(form);host.append(panel);document.body.append(host);
    host.addEventListener('pointerdown',e=>{if(e.target===host)cancel();});
    form.querySelector('#ratibQuickAccountCancel').onclick=cancel;
    form.addEventListener('submit',e=>{e.preventDefault();void save();});
    form.querySelector('#ratibQuickParentSearch').addEventListener('input',refreshParents);
    form.querySelector('#ratibQuickAccountParent').addEventListener('change',refreshCode);
    form.querySelector('#ratibQuickAccountCode').addEventListener('input',e=>{e.target.dataset.manual='1';});
    form.querySelector('#ratibQuickAccountName').addEventListener('input',showSimilar);
    host.addEventListener('keydown',e=>{
      if(e.key==='Escape'){e.preventDefault();cancel();}
      if(e.key==='Tab'){
        const controls=[...host.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled])')];
        if(!controls.length)return;
        const first=controls[0],last=controls.at(-1);
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
      }
    });
  }
  function refreshParents(){
    const box=document.getElementById('ratibQuickAccountParent');
    const search=normalized(document.getElementById('ratibQuickParentSearch').value);
    const previous=box.value;
    // Keep a single source for parent options in quick-create and account administration.
    if(window.RatibSimpleAccounts?.fillParentSelect?.(box,getCanonicalCatalog(),previous,search)){
      refreshCode();
      return;
    }
    box.replaceChildren();
    const option=document.createElement('option');option.value='';option.textContent='اختر الحساب الأب...';box.append(option);
    for(const row of parentRows()){
      if(search&&!normalized(row.text+' '+row.code).includes(search))continue;
      const o=document.createElement('option');o.value=row.path;o.textContent=row.text;box.append(o);
    }
    if([...box.options].some(o=>o.value===previous))box.value=previous;
    else box.value='';
    refreshCode();
  }
  function refreshCode(){
    const parent=document.getElementById('ratibQuickAccountParent').value;
    const field=document.getElementById('ratibQuickAccountCode');
    if(field.dataset.manual==='1')return;
    field.value=parent?suggestSubAccountCode(parent):'';
  }
  function showSimilar(){
    const box=document.getElementById('ratibQuickAccountSimilar');
    const name=document.getElementById('ratibQuickAccountName').value.trim();
    const q=normalized(name);box.replaceChildren();
    if(!q){msg('');return;}
    const found=getCanonicalCatalog().flatMap(x=>(x.details||[]).map(d=>d[1])).filter(n=>{
      const v=normalized(n);return v===q||v.includes(q)||q.includes(v);
    }).slice(0,4);
    if(found.length){
      const p=document.createElement('p');p.textContent='حسابات مشابهة موجودة: '+found.join('، ');
      box.append(p);
    }
    msg(accountExists(name)?'هذا الاسم مسجل بالفعل؛ اختره من القائمة بدل إنشاء حساب مكرر.':'',accountExists(name));
  }
  function open(selector,typed=''){
    if((!isVoucherSelector(selector)&&!selector?.ratibExternal)||busy)return;
    buildModal();current={selector,inputId:selector.input.id,lineId:selector.input.closest('tr')?.querySelector('.multi-line-account')?.dataset.index??null,priorFocus:document.activeElement};
    selector.close();
    const host=document.getElementById(modalId);host.hidden=false;
    const name=document.getElementById('ratibQuickAccountName');name.value=typed.trim();
    const code=document.getElementById('ratibQuickAccountCode');code.value='';delete code.dataset.manual;
    document.getElementById('ratibQuickParentSearch').value='';
    document.getElementById('ratibQuickAccountParent').value='';
    refreshParents();
    const list=document.getElementById('ratibQuickAccountCurrency');list.replaceChildren();
    for(const entry of currencies()){
      const o=document.createElement('option');o.value=entry.code;o.textContent=entry.name+' ('+entry.code+')';list.append(o);
    }
    const base=inputCurrency(selector);
    if([...list.options].some(o=>o.value===base))list.value=base;
    msg('');showSimilar();name.focus();
  }
  function cancel(){
    if(busy)return;
    const modal=document.getElementById(modalId);if(modal)modal.hidden=true;
    const target=current?.selector?.input;
    current=null;
    if(target?.isConnected)target.focus();
  }
  function findTarget(){
    if(!current)return null;
    if(current.selector?.input?.isConnected)return current.selector;
    if(typeof voucherRowSelectors!=='undefined'){
      const hit=voucherRowSelectors.find(x=>x.selector.input.id===current.inputId);
      if(hit)return hit.selector;
    }
    return null;
  }
  async function save(){
    if(busy||!current)return;
    const name=document.getElementById('ratibQuickAccountName').value.trim();
    const parent=document.getElementById('ratibQuickAccountParent').value;
    const codeInput=document.getElementById('ratibQuickAccountCode');
    const code=normalizeParentQuery(codeInput.value);
    const currency=document.getElementById('ratibQuickAccountCurrency').value;
    if(!name||!/[\p{L}]/u.test(name)){msg('أدخل اسم حساب صحيحًا يحتوي على حروف.',true);return;}
    if(accountExists(name)||isAccountNameInUse(name)){msg('الاسم مستخدم في الدليل أو له حركات سابقة. اختر اسمًا آخر.',true);return;}
    const row=getCanonicalCatalog().find(x=>catalogSubKey(x)===parent);
    if(!row){msg('اختر الحساب الأب الصحيح أولًا.',true);return;}
    if(!/^\d{6}$/.test(code)){msg('رقم الحساب التفصيلي يجب أن يتكون من 6 أرقام.',true);return;}
    const conflict=accountCodeConflictMessage(code);
    if(conflict){msg(conflict,true);return;}
    if(!currencies().some(x=>x.code===currency)){msg('اختر عملة متاحة من إدارة العملات.',true);return;}
    const target=findTarget();
    if(!target){msg('تغير حقل الحساب أثناء الإضافة. أغلق النافذة وأعد المحاولة.',true);return;}
    const saveBtn=document.getElementById('ratibQuickAccountSave');
    busy=true;saveBtn.disabled=true;saveBtn.textContent='جارٍ الحفظ...';
    try{
      if(!addCatalogDetail(name,code,parent))throw new Error('رفض دليل الحسابات إضافة الاسم أو الرقم.');
      const codes=getAccountCodes();codes[name]=code;store.set('account_codes',codes);
      // Account currency is an initial supported currency, not a forced voucher conversion.
      const curMap=store.get('account_currencies',{})||{};
      curMap[name]=[currency];store.set('account_currencies',curMap);
      if(typeof flushStorage==='function')await flushStorage();
      const confirmed=getCanonicalCatalog().some(x=>(x.details||[]).some(d=>String(d[0])===code&&d[1]===name));
      if(!confirmed)throw new Error('تعذر التحقق من إضافة الحساب في الدليل.');
      updateSearchableData();
      const item=getMultiAccountItems().find(x=>x.id===name&&x.accountId===code);
      if(!item)throw new Error('أضيف الحساب، لكن تعذر تحديث قائمة البحث.');
      const selected=findTarget()||target;
      // Dynamic journal/cash rows use their own SearchableSelect instances.
      if(selected.items&&!selected.items.some(x=>x.id===name&&x.accountId===code))selected.setItems(getMultiAccountItems());
      selected.choose(item);
      selected.close();
      try{refreshAccountsTreesPreservingPosition();}catch(err){console.warn('Quick account tree refresh:',err);}
      document.getElementById(modalId).hidden=true;
      current=null;
      const voucherCurrency=inputCurrency(selected);
      if(voucherCurrency&&voucherCurrency!==currency){
        showToast('تم إنشاء الحساب '+name+'. العملة المختارة للحساب '+currency+' تختلف عن عملة السند '+voucherCurrency+'؛ لم نغيّر المبلغ أو سعر الصرف.','warn',6500);
      }else showToast('تم إنشاء الحساب واختياره: '+name,'success',4500);
      if(selected.input.isConnected)selected.input.focus();
    }catch(error){
      console.error('Quick account creation:',error);
      msg((accountExists(name)?'يوجد حساب بهذا الاسم في الدليل. ':'')+'لم يكتمل تأكيد الحفظ: '+String(error?.message||error),true);
    }finally{busy=false;saveBtn.disabled=false;saveBtn.textContent='حفظ واختيار الحساب';}
  }
  function install(){
    if(typeof SearchableSelect!=='function'||typeof addCatalogDetail!=='function')return;
    const original=SearchableSelect.prototype.renderDropdown;
    if(original._ratibQuickCreateInstalled)return;
    const patched=function(query=''){
      const items=original.apply(this,arguments);
      if(!isVoucherSelector(this)||!this.list)return items;
      const name=(this.inlineOpen?this.inlineInput.value:String(query||this.input.value||'')).trim();
      if(!name||!/[\p{L}]/u.test(name)||this.getValue()||accountExists(name))return items;
      const row=document.createElement('div');row.className='ratib-quick-account-choice';
      const button=document.createElement('button');button.type='button';button.className='ratib-quick-create-action';
      button.textContent='＋ إنشاء حساب جديد «'+name.slice(0,75)+'»';
      button.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')e.preventDefault();});
      button.addEventListener('click',e=>{e.stopPropagation();open(this,name);});
      row.append(button);this.list.append(row);
      return items;
    };
    patched._ratibQuickCreateInstalled=true;
    SearchableSelect.prototype.renderDropdown=patched;
    buildModal();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
  window.ratibQuickAccount={openForInput(id){
    const choices=[typeof selDebitAcc!=='undefined'?selDebitAcc:null,typeof selCreditAcc!=='undefined'?selCreditAcc:null,
      typeof selEditDebitAcc!=='undefined'?selEditDebitAcc:null,typeof selEditCreditAcc!=='undefined'?selEditCreditAcc:null,
      typeof multiSourceAcc!=='undefined'?multiSourceAcc:null,
      ...(typeof voucherRowSelectors!=='undefined'?voucherRowSelectors.map(x=>x.selector):[])];
    const found=choices.find(x=>x?.input?.id===id);
    if(found)open(found,found.input.value);
    return Boolean(found);
  },openForExternalInput(input,choose){
    if(!(input instanceof HTMLInputElement)||!input.isConnected||typeof choose!=='function')return false;
    const selector={ratibExternal:true,input,close(){},choose};
    open(selector,input.value);
    return true;
  }};
}());
