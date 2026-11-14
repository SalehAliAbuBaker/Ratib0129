// Compare numeric values consistently across Arabic/English OS display locales.
module.exports=value=>String(value).replace(/[٠-٩۰-۹]/g,c=>String(c.charCodeAt(0)-(c<='٩'?0x660:0x6f0))).replace(/٬/g,',').replace(/٫/g,'.').replace(/[\u061c\u200e\u200f]/g,'');
