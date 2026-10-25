/* Read-only archived-account visibility for previously saved accounting data. */
(()=>{'use strict';
window.ratibImportVisibleCatalog=function(catalog){
 const hidden=new Set(store.get('import_archived_accounts',[]));
 if(!hidden.size)return catalog;
 return catalog.map(row=>({...row,details:(row.details||[]).filter(item=>!hidden.has(String(item[0]).trim()+'|'+String(item[1]).trim()))}));
};
})();