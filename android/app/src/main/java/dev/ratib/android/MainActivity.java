package dev.ratib.android;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ClipData;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.hardware.biometrics.BiometricPrompt;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.ParcelFileDescriptor;
import android.print.PageRange;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.provider.DocumentsContract;
import android.util.Base64;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceError;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Button;
import org.json.JSONArray;
import org.json.JSONObject;
import android.accounts.Account;
import android.util.AtomicFile;
import com.google.android.gms.auth.api.identity.Identity;
import com.google.android.gms.auth.api.identity.AuthorizationRequest;
import com.google.android.gms.auth.api.identity.AuthorizationResult;
import com.google.android.gms.auth.api.identity.ClearTokenRequest;
import com.google.android.gms.common.api.Scope;
import com.google.android.gms.common.api.ApiException;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class MainActivity extends Activity {
    public static final String ORIGIN = LocalAssets.ORIGIN;
    private static final int PICK_FILE=100, SAVE_FILE=101, PICK_TREE=102, NOTIFY_PERMISSION=103, PICK_BACKUP=104, GOOGLE_AUTH=105;
    private static final long MAX_FILE=128L*1024*1024;
    private WebView web;
    private FrameLayout root;
    private SharedPreferences prefs;
    private final ExecutorService io=Executors.newSingleThreadExecutor();
    private final Map<String,Transfer> transfers=new ConcurrentHashMap<>();
    private final Map<String,File> incomingBackups=new ConcurrentHashMap<>();
    private final ArrayDeque<ExportJob> exports=new ArrayDeque<>();
    private ExportJob activeExport;
    private String treeRequest, notificationRequest;
    private ValueCallback<Uri[]> fileCallback;
    private CancellationSignal biometricSignal;
    private boolean printBusy;
    private LocalAssets localAssets;
    private View loadFailure;
    private int loadGeneration;
    private String backupRequest;
    private volatile String googleRequest,googleExpectedEmail,driveToken;
    private volatile long driveTokenExpiry;

    @Override protected void attachBaseContext(android.content.Context base) {
        // Keep Arabic controls, but request Latin digits for native date fields.
        Locale displayLocale=Locale.forLanguageTag("ar-u-nu-latn");
        Locale.setDefault(displayLocale);
        android.content.res.Configuration config=new android.content.res.Configuration(base.getResources().getConfiguration());
        config.setLocales(new android.os.LocaleList(displayLocale));
        super.attachBaseContext(base.createConfigurationContext(config));
    }

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        prefs=getSharedPreferences("ratib-native",MODE_PRIVATE);
        localAssets=new LocalAssets(this);
        root=new FrameLayout(this);
        setContentView(root);
        root.setOnApplyWindowInsetsListener((view,insets)->{
            view.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),
                insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());
            return insets.consumeSystemWindowInsets();
        });
        web=new WebView(this);
        configure(web,true);
        web.addJavascriptInterface(new Bridge(),"RatibNative");
        root.addView(web,new FrameLayout.LayoutParams(-1,-1));
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params) {
                if(fileCallback!=null)fileCallback.onReceiveValue(null);
                fileCallback=callback;
                Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");
                intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,params.getMode()==FileChooserParams.MODE_OPEN_MULTIPLE);
                try { startActivityForResult(intent,PICK_FILE); }
                catch(Exception ex){fileCallback.onReceiveValue(null);fileCallback=null;showError("لا يوجد منتقي ملفات على الجهاز");}
                return true;
            }
            @Override public void onPermissionRequest(PermissionRequest request){request.deny();}
            @Override public boolean onConsoleMessage(android.webkit.ConsoleMessage message){
                if(message.messageLevel()==android.webkit.ConsoleMessage.MessageLevel.ERROR){
                    // Log source location only; never console payloads or accounting data.
                    android.util.Log.e("RatibLocalAssets","JavaScript error at line "+message.lineNumber());
                }
                return true;
            }
        });
        createNotificationChannel();
        cleanOldExports();
        android.content.pm.PackageInfo engine=WebView.getCurrentWebViewPackage();
        if(engine!=null){
            try{int major=Integer.parseInt(engine.versionName.split("\\.")[0]);if(major<100){
                new AlertDialog.Builder(this).setTitle("تحديث مكوّن عرض أندرويد")
                    .setMessage("يحتاج راتب إلى إصدار حديث من Android System WebView لتشغيل وظائفه. حدّث المكوّن ثم افتح راتب مرة أخرى؛ ستبقى بياناتك محفوظة.")
                    .setCancelable(false).setPositiveButton("فتح المتجر",(dialog,which)->{openExternal(Uri.parse("https://play.google.com/store/apps/details?id="+engine.packageName));finish();})
                    .setNegativeButton("إغلاق",(dialog,which)->finish()).show();return;
            }}catch(NumberFormatException ignored){}
        }
        loadLocalEntry();
    }

    private void configure(WebView view,boolean main) {
        WebSettings settings=view.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(main);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(main);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setSupportMultipleWindows(false);
        view.setWebViewClient(new WebViewClient(){
            @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest request){return asset(request.getUrl());}
            @Override @SuppressWarnings("deprecation") public WebResourceResponse shouldInterceptRequest(WebView v,String url){return asset(Uri.parse(url));}
            @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest request){
                Uri uri=request.getUrl();
                if(isLocal(uri))return false;
                if(request.isForMainFrame())openExternal(uri);
                return true;
            }
            @Override public void onPageStarted(WebView v,String url,android.graphics.Bitmap icon){
                super.onPageStarted(v,url,icon);
                if(main) for(String id:transfers.keySet()){
                    Transfer t=transfers.remove(id);
                    if(t!=null) synchronized(t){try{t.out.close();}catch(Exception ignored){}t.file.delete();}
                }
            }
            @Override public void onPageFinished(WebView v,String url){if(main&&LocalAssets.ENTRY.equals(url))verifyLocalStartup(v,loadGeneration,0);}
            @Override public void onReceivedError(WebView v,WebResourceRequest request,WebResourceError error){
                if(main&&request.isForMainFrame())showLoadFailure("رمز تحميل الواجهة: "+error.getErrorCode());
                else if(isLocal(request.getUrl()))android.util.Log.e("RatibLocalAssets","Local resource load failed");
            }
            @Override public void onReceivedHttpError(WebView v,WebResourceRequest request,WebResourceResponse response){
                if(main&&request.isForMainFrame())showLoadFailure("رمز الملف المحلي: "+response.getStatusCode());
            }
        });
        if(BuildConfig.DEBUG)WebView.setWebContentsDebuggingEnabled(true);
    }

    static boolean isLocal(Uri uri){return LocalAssets.owns(uri);}
    private WebResourceResponse asset(Uri uri) {
        return localAssets.intercept(uri);
    }
    private void loadLocalEntry(){
        final int generation=++loadGeneration;
        if(loadFailure!=null){root.removeView(loadFailure);loadFailure=null;}
        io.execute(()->{
            try{
                final String html=localAssets.readEntry();
                runOnUiThread(()->{if(web!=null&&!isDestroyed()&&generation==loadGeneration){
                    // Read the main document from APK: no DNS, TLS or network request.
                    // The HTTPS base retains v1's origin and relative asset paths.
                    web.loadDataWithBaseURL(LocalAssets.ENTRY,html,"text/html","UTF-8",LocalAssets.ENTRY);
                }});
            }catch(Exception ex){runOnUiThread(()->showLoadFailure("تعذر قراءة index.html من حزمة التطبيق"));}
        });
    }
    private void verifyLocalStartup(WebView view,int generation,int attempt){
        if(generation!=loadGeneration||isDestroyed())return;
        view.evaluateJavascript("(()=>{try{return !!document.getElementById('mainWrap')&&typeof store==='object'&&!!window.RatibAndroid&&!!window.RatibLicense;}catch(e){return false;}})()",value->{
            if(generation!=loadGeneration||isDestroyed())return;
            if("true".equals(value)){
                android.util.Log.i("RatibLocalAssets","Packaged interface ready (build "+BuildConfig.VERSION_CODE+")");
                if(loadFailure!=null){root.removeView(loadFailure);loadFailure=null;}
            }else if(attempt<120)view.postDelayed(()->verifyLocalStartup(view,generation,attempt+1),250);
            else showLoadFailure("لم تكتمل تهيئة ملفات الواجهة المحلية");
        });
    }
    private void showLoadFailure(String reason){
        if(isDestroyed()||isFinishing()||loadFailure!=null)return;
        android.util.Log.e("RatibLocalAssets",reason);
        LinearLayout panel=new LinearLayout(this);panel.setOrientation(LinearLayout.VERTICAL);panel.setPadding(32,48,32,32);panel.setBackgroundColor(0xfff8fafc);
        TextView message=new TextView(this);message.setTextSize(18);message.setText("تعذر فتح ملفات راتب المحلية.\n"+reason+"\nلم تُحذف بياناتك. لا يحتاج فتح الواجهة إلى الإنترنت.");panel.addView(message);
        Button retry=new Button(this);retry.setText("إعادة فتح الواجهة المحلية");retry.setOnClickListener(v->loadLocalEntry());panel.addView(retry);
        loadFailure=panel;root.addView(panel,new FrameLayout.LayoutParams(-1,-1));
    }

    private void openExternal(Uri uri){
        String scheme=uri.getScheme();
        if(!("https".equals(scheme)||"mailto".equals(scheme)||"tel".equals(scheme)))return;
        try{startActivity(new Intent(Intent.ACTION_VIEW,uri));}catch(Exception ex){showError("لا يوجد تطبيق لفتح هذا الرابط");}
    }
    public static String mimeFor(String name,String fallback){
        String lower=name==null?"":name.toLowerCase(Locale.ROOT);
        if(lower.endsWith(".html"))return "text/html";
        if(lower.endsWith(".js"))return "application/javascript";
        if(lower.endsWith(".css"))return "text/css";
        if(lower.endsWith(".json"))return "application/json";
        if(lower.endsWith(".gz"))return "application/gzip";
        if(lower.endsWith(".pdf"))return "application/pdf";
        if(lower.endsWith(".xlsx"))return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        if(lower.endsWith(".xls"))return "application/vnd.ms-excel";
        if(lower.endsWith(".csv"))return "text/csv";
        if(lower.endsWith(".tsv"))return "text/tab-separated-values";
        if(lower.endsWith(".png"))return "image/png";
        if(lower.endsWith(".woff2"))return "font/woff2";
        return fallback;
    }
    public static String safeName(String name){
        String clean=(name==null?"ratib-file":name).replaceAll("[\\\\/\\p{Cntrl}]","_").trim();
        if(clean.isEmpty()||clean.equals(".")||clean.equals(".."))clean="ratib-file";
        if(clean.length()>160){int dot=clean.lastIndexOf('.');String extension=dot>=0&&clean.length()-dot<=20?clean.substring(dot):"";clean=clean.substring(0,160-extension.length())+extension;}
        return clean;
    }
    private void result(String id,boolean ok,Object value){
        final String encoded=JSONObject.wrap(value)==JSONObject.NULL?"null":value instanceof JSONObject||value instanceof JSONArray||value instanceof Boolean||value instanceof Number?value.toString():JSONObject.quote(String.valueOf(value));
        runOnUiThread(()->{if(web!=null&&!isDestroyed())web.evaluateJavascript("window.__ratibNativeResult&&window.__ratibNativeResult("+JSONObject.quote(id)+","+ok+","+encoded+")",null);});
    }
    private void fail(String id,Exception ex){result(id,false,ex.getMessage()==null?"تعذر تنفيذ العملية":ex.getMessage());}
    private void abort(String id){try{result(id,false,new JSONObject().put("name","AbortError").put("message","أُلغيت العملية"));}catch(Exception ignored){}}
    private void showError(String message){if(!isFinishing())new AlertDialog.Builder(this).setMessage(message).setPositiveButton("حسناً",null).show();}

    private final class Bridge {
        @JavascriptInterface public String capabilities(){
            try{return new JSONObject().put("biometric",hasBiometrics()).put("notifications",notificationsAllowed()).put("androidVersion",BuildConfig.VERSION_CODE).toString();}
            catch(Exception ex){return "{}";}
        }
        @JavascriptInterface public String beginFile(String id,String name,String mime,String action){
            if(!id.matches("f[0-9]{1,12}")||!("save".equals(action)||"share".equals(action)||"driveUpload".equals(action)||"autoBackup".equals(action)||"checkpoint".equals(action)))return "Invalid export";
            try{
                if(transfers.size()>=4||transfers.containsKey(id))throw new Exception("انتظر انتهاء التصدير الحالي");
                File dir=new File(getCacheDir(),"exports");if(!dir.isDirectory()&&!dir.mkdirs())throw new Exception("تعذر إنشاء ملف التصدير");
                String clean=safeName(name);Transfer transfer=new Transfer(new File(dir,id+"-"+clean),clean,mimeFor(clean,mime),action);
                transfers.put(id,transfer);return "";
            }catch(Exception ex){return ex.getMessage();}
        }
        @JavascriptInterface public String appendFile(String id,String chunk){
            Transfer t=transfers.get(id);if(t==null)return "Export not found";
            try{
                if(chunk.length()>512*1024)throw new Exception("Invalid chunk");
                byte[] bytes=Base64.decode(chunk,Base64.NO_WRAP);
                synchronized(t){if(t.size+bytes.length>MAX_FILE)throw new Exception("الملف أكبر من 128 MB");t.out.write(bytes);t.size+=bytes.length;}
                return "";
            }catch(Exception ex){abortFile(id);return ex.getMessage();}
        }
        @JavascriptInterface public void abortFile(String id){Transfer t=transfers.remove(id);if(t!=null){try{t.out.close();}catch(Exception ignored){}t.file.delete();}}
        @JavascriptInterface public void request(String id,String method,String arguments){
            if(!id.matches("r[0-9]{1,12}"))return;
            if(arguments.length()>24*1024*1024){result(id,false,"البيانات أكبر من الحد المدعوم لهذه العملية");return;}
            try{
                JSONObject args=new JSONObject(arguments);
                switch(method){
                    case "licenseRequest":io.execute(()->{try{String action=args.getString("action");if(!action.equals("activate")&&!action.equals("verify"))throw new Exception("عملية ترخيص غير مسموحة");result(id,true,NativeHttp.call("https://ratib.saleh0129.workers.dev/api/license/"+action,"POST",args.getString("body"),"application/json",null));}catch(Exception ex){try{result(id,false,new JSONObject().put("name","TypeError").put("message","تعذر الاتصال بخادم التراخيص. تحقق من الإنترنت وتاريخ الهاتف ثم أعد المحاولة."));}catch(Exception ignored){}}});break;
                    case "googleAuthorize":runOnUiThread(()->{try{authorizeGoogle(id,args);}catch(Exception ex){googleRequest=id;googleFailure("تعذر تشغيل خدمات Google على الجهاز. حدّث Google Play services وتحقق من إعداد OAuth لأندرويد.");}});break;
                    case "googleDisconnect":driveToken=null;driveTokenExpiry=0;prefs.edit().remove("googleEmail").apply();result(id,true,true);break;
                    case "driveRequest":io.execute(()->nativeDriveRequest(id,args));break;
                    case "chooseBackup":runOnUiThread(()->{if(backupRequest!=null){result(id,false,"انتظر اختيار الملف الحالي");return;}backupRequest=id;try{startActivityForResult(new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION),PICK_BACKUP);}catch(Exception ex){backupRequest=null;fail(id,ex);}});break;
                    case "restoreCheckpointRead":io.execute(()->{try(InputStream in=new AtomicFile(new File(getFilesDir(),"before-restore.json")).openRead()){offerBackup(id,"ratib-before-restore.json",in);}catch(Exception ex){result(id,false,"لا توجد نسخة تراجع متاحة قبل الاستعادة");}});break;
                    case "readBackupChunk":io.execute(()->{try{File file=incomingBackups.get(args.getString("readId")); int offset=args.getInt("offset"); if(file==null||offset<0||offset>=file.length())throw new Exception("جلسة قراءة غير صالحة"); try(java.io.RandomAccessFile reader=new java.io.RandomAccessFile(file,"r")){reader.seek(offset);byte[] chunk=new byte[(int)Math.min(49152,file.length()-offset)];reader.readFully(chunk);result(id,true,Base64.encodeToString(chunk,Base64.NO_WRAP));}}catch(Exception ex){fail(id,ex);}});break;
                    case "releaseBackup":File finished=incomingBackups.remove(args.getString("readId"));if(finished!=null)finished.delete();result(id,true,true);break;
                    case "finishFile": {
                        Transfer t=transfers.remove(args.getString("fileId"));if(t==null)throw new Exception("Export not found");
                        synchronized(t){t.out.getFD().sync();t.out.close();}
                        if("checkpoint".equals(t.action)){io.execute(()->{try{saveCheckpoint(t.file);result(id,true,true);}catch(Exception ex){fail(id,ex);}finally{t.file.delete();}});break;}
                        if ("driveUpload".equals(t.action)) {
                            io.execute(()->{try{nativeDriveRequest(id,args,t.file);}finally{t.file.delete();}});
                            break;
                        }
                        if ("autoBackup".equals(t.action)) {
                            io.execute(() -> {
                                try { writeBackup(t.name, t.file); result(id, true, true); }
                                catch (Exception ex) { fail(id, ex); }
                                finally { t.file.delete(); }
                            });
                            break;
                        }
                        ExportJob job=new ExportJob(id,t);runOnUiThread(()->{if("share".equals(t.action))share(job);else{exports.add(job);nextExport();}});break;
                    }
                    case "print":runOnUiThread(()->printHtml(id,args));break;
                    case "chooseTree":runOnUiThread(()->chooseTree(id));break;
                    case "interfaceFont": {
                        String size=args.getString("size");
                        int zoom;
                        switch(size){
                            case "xxsmall": zoom=76;break;
                            case "xsmall": zoom=82;break;
                            case "small": zoom=90;break;
                            case "large": zoom=110;break;
                            case "xlarge": zoom=120;break;
                            case "xxlarge": zoom=130;break;
                            default: zoom=100;
                        }
                        runOnUiThread(()->{
                            if(web!=null && web.getSettings().getTextZoom()!=zoom)web.getSettings().setTextZoom(zoom);
                            result(id,true,true);
                        });
                        break;
                    }
                    case "treeStatus":io.execute(()->{try{Uri tree=tree();JSONObject status=new JSONObject().put("available",tree!=null);if(tree!=null)status.put("name",documentName(rootDocument(tree)));result(id,true,status);}catch(Exception ex){fail(id,ex);}});break;
                    case "disableTree":io.execute(()->{String saved=prefs.getString("tree",null);prefs.edit().remove("tree").remove("backupAnchor").commit();if(saved!=null)try{getContentResolver().releasePersistableUriPermission(Uri.parse(saved),Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_WRITE_URI_PERMISSION);}catch(Exception ignored){}result(id,true,true);});break;
                    case "backupLatest":io.execute(()->{try{List<Document> list=backups(requireTree());if(list.isEmpty())throw new Exception("لا توجد نسخة احتياطية في المجلد المختار");Document doc=list.get(list.size()-1);try(InputStream in=getContentResolver().openInputStream(doc.uri)){offerBackup(id,doc.name,in);}}catch(Exception ex){fail(id,ex);}});break;
                    case "voiceStart":runOnUiThread(()->startVoice(id,args));break;
                    case "voiceCancel":runOnUiThread(()->{cancelVoice();result(id,true,true);});break;
                    case "biometricWrap":runOnUiThread(()->biometricVault.prompt(MainActivity.this,args,true,(ok,value)->result(id,ok,value)));break;
                    case "biometricUnwrap":runOnUiThread(()->biometricVault.prompt(MainActivity.this,args,false,(ok,value)->result(id,ok,value)));break;
                    case "biometricDelete":BiometricVault.delete(args.getString("id"));result(id,true,true);break;
                    case "biometric":runOnUiThread(()->biometric(id,args));break;
                    case "disableBiometric":prefs.edit().remove("biometric").apply();result(id,true,true);break;
                    case "notificationPermission":runOnUiThread(()->notificationPermission(id));break;
                    case "notify":runOnUiThread(()->{try{notifyUser(args);result(id,true,true);}catch(Exception ex){fail(id,ex);}});break;
                    case "shareText":runOnUiThread(()->{try{startActivity(Intent.createChooser(new Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT,args.optString("text")),"مشاركة"));result(id,true,true);}catch(Exception ex){fail(id,ex);}});break;
                    case "exit":runOnUiThread(()->{result(id,true,true);finish();});break;
                    default:throw new Exception("Unsupported native operation");
                }
            }catch(Exception ex){fail(id,ex);}
        }
    }

    private static final class Transfer{
        final File file;final String name,mime,action;final FileOutputStream out;long size;
        Transfer(File file,String name,String mime,String action)throws Exception{this.file=file;this.name=name;this.mime=mime;this.action=action;out=new FileOutputStream(file);}
    }
    private static final class ExportJob{final String id;final Transfer transfer;ExportJob(String id,Transfer t){this.id=id;transfer=t;}}
    private void nextExport(){
        if(activeExport!=null||exports.isEmpty())return;
        activeExport=exports.remove();
        try{startActivityForResult(new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType(activeExport.transfer.mime).putExtra(Intent.EXTRA_TITLE,activeExport.transfer.name),SAVE_FILE);}
        catch(Exception ex){fail(activeExport.id,ex);activeExport.transfer.file.delete();activeExport=null;nextExport();}
    }
    private void share(ExportJob job){
        try{
            Uri uri=new Uri.Builder().scheme("content").authority(getPackageName()+".files").appendPath(job.transfer.file.getName()).build();
            Intent intent=new Intent(Intent.ACTION_SEND).setType(job.transfer.mime).putExtra(Intent.EXTRA_STREAM,uri).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.setClipData(ClipData.newUri(getContentResolver(),job.transfer.name,uri));
            startActivity(Intent.createChooser(intent,"مشاركة "+job.transfer.name));result(job.id,true,true);
        }catch(Exception ex){fail(job.id,ex);}
    }
    private void chooseTree(String id){
        if(treeRequest!=null){result(id,false,"انتظر اختيار المجلد الحالي");return;}
        treeRequest=id;
        try{startActivityForResult(new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_WRITE_URI_PERMISSION|Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION|Intent.FLAG_GRANT_PREFIX_URI_PERMISSION),PICK_TREE);}
        catch(Exception ex){treeRequest=null;fail(id,ex);}
    }
    private static void copyBackup(InputStream in, OutputStream out) throws Exception {
        if (in == null) throw new java.io.IOException("تعذر فتح النسخة");
        byte[] buffer = new byte[65536];
        long size = 0;
        int n;
        while ((n = in.read(buffer)) != -1) {
            size += n;
            if (size > MAX_FILE) throw new java.io.IOException("النسخة أكبر من 128 MB");
            out.write(buffer, 0, n);
        }
    }
    private void offerBackup(String id, String name, InputStream in) throws Exception {
        if (incomingBackups.size() >= 2) throw new java.io.IOException("انتظر انتهاء قراءة النسخة الحالية");
        File file = File.createTempFile("ratib-read-", ".tmp", getCacheDir());
        try (FileOutputStream out = new FileOutputStream(file)) {
            copyBackup(in, out);
        } catch (Exception ex) { file.delete(); throw ex; }
        String readId = "b" + UUID.randomUUID();
        incomingBackups.put(readId, file);
        result(id,true,new JSONObject().put("name",name).put("readId",readId).put("size",file.length()));
    }
    private void saveCheckpoint(File file) throws Exception {
        validateBackupFile(file);
        AtomicFile checkpoint = new AtomicFile(new File(getFilesDir(),"before-restore.json"));
        java.security.MessageDigest expected = java.security.MessageDigest.getInstance("SHA-256");
        FileOutputStream out = checkpoint.startWrite();
        try (InputStream in = new java.security.DigestInputStream(new FileInputStream(file),expected)) {
            copyBackup(in,out);
            checkpoint.finishWrite(out);
        } catch (Exception ex) { checkpoint.failWrite(out); throw ex; }
        java.security.MessageDigest actual = java.security.MessageDigest.getInstance("SHA-256");
        try (InputStream in = new java.security.DigestInputStream(checkpoint.openRead(),actual)) {
            byte[] buffer = new byte[65536];
            while (in.read(buffer) != -1) {}
        }
        if (!java.security.MessageDigest.isEqual(expected.digest(),actual.digest()))
            throw new java.io.IOException("تعذر تأكيد سلامة نسخة التراجع.");
    }
    private void authorizeGoogle(String id,JSONObject args){
        if(googleRequest!=null){result(id,false,"انتظر انتهاء ربط حساب Google الحالي");return;}
        String email=args.optString("email","").trim().toLowerCase(Locale.ROOT);
        if(driveToken!=null&&System.currentTimeMillis()<driveTokenExpiry&&(email.isEmpty()||email.equals(prefs.getString("googleEmail","")))){
            try{result(id,true,new JSONObject().put("email",prefs.getString("googleEmail","")));}catch(Exception ex){fail(id,ex);}return;
        }
        googleRequest=id;googleExpectedEmail=email;
        AuthorizationRequest.Builder builder=AuthorizationRequest.builder().setRequestedScopes(Collections.singletonList(new Scope("https://www.googleapis.com/auth/drive.file")));
        if(!email.isEmpty())builder.setAccount(new Account(email,"com.google"));
        Identity.getAuthorizationClient(this).authorize(builder.build()).addOnSuccessListener(auth->{
            if(auth.hasResolution()){
                if(!args.optBoolean("interactive",false)){googleFailure("يحتاج Google إلى موافقتك. اضغط ربط الحساب أو نسخ الآن.");return;}
                try{startIntentSenderForResult(auth.getPendingIntent().getIntentSender(),GOOGLE_AUTH,null,0,0,0);}
                catch(Exception ex){googleFailure("تعذر فتح نافذة موافقة Google");}
            }else completeGoogle(auth);
        }).addOnFailureListener(ex->{int code=ex instanceof ApiException?((ApiException)ex).getStatusCode():-1;
            googleFailure(code==10?"إعداد Google لأندرويد غير مكتمل. يلزم تسجيل dev.ratib.android وبصمة توقيع الإصدار في مشروع Google الأصلي.":"تعذر الحصول على إذن Google (رمز "+code+"). تحقق من خدمات Google والاتصال وإعداد OAuth لأندرويد.");});
    }
    private void googleFailure(String message){String id=googleRequest;googleRequest=null;driveToken=null;driveTokenExpiry=0;if(id!=null)result(id,false,message);}
    private void nativeDriveRequest(String id,JSONObject args){nativeDriveRequest(id,args,null);}
    private void nativeDriveRequest(String id,JSONObject args,File upload){
        try{
            if(System.currentTimeMillis()>=driveTokenExpiry)throw new Exception("انتهت جلسة Google. اضغط ربط الحساب أو نسخ الآن لتجديد الإذن.");
            String token=driveToken;
            String url=args.getString("url"),method=args.optString("method","GET");
            final JSONObject response;
            if(upload!=null){
                if(!"POST".equals(method)||!url.startsWith("https://www.googleapis.com/upload/drive/v3/files?"))
                    throw new Exception("عملية رفع غير مسموحة");
                response=NativeHttp.callFile(url,method,upload,args.optString("contentType","application/octet-stream"),token);
            }else if("GET".equals(method)&&"media".equals(Uri.parse(url).getQueryParameter("alt"))){
                File download=File.createTempFile("ratib-drive-", ".tmp",getCacheDir());
                try{
                    response=NativeHttp.download(url,token,download);
                    if(response.getInt("status")>=200&&response.getInt("status")<300){
                        String readId="b"+UUID.randomUUID();
                        if(incomingBackups.size()>=2)throw new Exception("انتظر انتهاء قراءة النسخة الحالية");
                        incomingBackups.put(readId,download);
                        response.put("readId",readId).put("size",download.length());
                    }else download.delete();
                }catch(Exception ex){download.delete();throw ex;}
            }else response=NativeHttp.call(url,method,args.optString("body",""),args.optString("contentType","application/json"),token);
            if(response.getInt("status")==401){driveToken=null;driveTokenExpiry=0;runOnUiThread(()->{
                try{Identity.getAuthorizationClient(this).clearToken(ClearTokenRequest.builder().setToken(token).build()).addOnCompleteListener(task->result(id,true,response));}
                catch(Exception ignored){result(id,true,response);}
            });return;}
            result(id,true,response);
        }catch(Exception ex){result(id,false,"تعذر الاتصال بـ Google Drive: "+(ex instanceof java.io.IOException?"تحقق من الإنترنت ثم أعد المحاولة":ex.getMessage()));}
    }
    private void completeGoogle(AuthorizationResult auth){
        final String token=auth.getAccessToken(),expected=googleExpectedEmail,id=googleRequest;
        if(token==null||token.isEmpty()){googleFailure("لم يمنح Google إذن الوصول إلى Drive");return;}
        io.execute(()->{try{
            JSONObject r=NativeHttp.call("https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)","GET","","application/json",token);
            if(r.getInt("status")!=200)throw new Exception("تعذر التحقق من حساب Google. تحقق من تفعيل Drive API في مشروع Google.");
            String email=new JSONObject(r.getString("body")).getJSONObject("user").getString("emailAddress").toLowerCase(Locale.ROOT);
            if(!expected.isEmpty()&&!email.equals(expected))throw new Exception("الحساب الذي وافق عليه Google يختلف عن البريد المطلوب؛ لم تُرفع بياناتك.");
            driveToken=token;driveTokenExpiry=System.currentTimeMillis()+3300000L;prefs.edit().putString("googleEmail",email).commit();googleRequest=null;
            result(id,true,new JSONObject().put("email",email));
        }catch(Exception ex){googleFailure(ex.getMessage()==null?"تعذر التحقق من حساب Google":ex.getMessage());}});
    }
    @Override protected void onActivityResult(int request,int code,Intent data){
        super.onActivityResult(request,code,data);
        if(request==GOOGLE_AUTH&&googleRequest!=null){
            if(code!=RESULT_OK||data==null){String id=googleRequest;googleRequest=null;abort(id);return;}
            try{completeGoogle(Identity.getAuthorizationClient(this).getAuthorizationResultFromIntent(data));}
            catch(ApiException ex){googleFailure("لم يكتمل إذن Google (رمز "+ex.getStatusCode()+"). تحقق من إعداد OAuth لأندرويد.");}
        }else if(request==PICK_BACKUP&&backupRequest!=null){
            String id=backupRequest;backupRequest=null;
            if(code!=RESULT_OK||data==null||data.getData()==null){abort(id);return;}
            Uri uri=data.getData();io.execute(()->{try(InputStream in=getContentResolver().openInputStream(uri)){
                if(in==null)throw new Exception("تعذر فتح ملف النسخة الاحتياطية");
                offerBackup(id,documentName(uri),in);
            }catch(Exception ex){fail(id,ex);}});
        }else if(request==PICK_FILE){
            if(fileCallback==null)return;
            Uri[] uris=null;
            if(code==RESULT_OK&&data!=null){if(data.getClipData()!=null){uris=new Uri[data.getClipData().getItemCount()];for(int i=0;i<uris.length;i++)uris[i]=data.getClipData().getItemAt(i).getUri();}else if(data.getData()!=null)uris=new Uri[]{data.getData()};}
            fileCallback.onReceiveValue(uris);fileCallback=null;
        }else if(request==SAVE_FILE&&activeExport!=null){
            ExportJob job=activeExport;activeExport=null;
            if(code!=RESULT_OK||data==null||data.getData()==null){abort(job.id);job.transfer.file.delete();nextExport();return;}
            Uri target=data.getData();
            io.execute(()->{try(InputStream in=new java.io.FileInputStream(job.transfer.file);OutputStream out=getContentResolver().openOutputStream(target,"wt")){
                if(out==null)throw new Exception("تعذر فتح الملف للحفظ");byte[] buffer=new byte[65536];int n;while((n=in.read(buffer))!=-1)out.write(buffer,0,n);out.flush();result(job.id,true,true);
            }catch(Exception ex){fail(job.id,ex);}finally{job.transfer.file.delete();runOnUiThread(()->nextExport());}});
        }else if(request==PICK_TREE&&treeRequest!=null){
            String id=treeRequest;treeRequest=null;
            if(code!=RESULT_OK||data==null||data.getData()==null){abort(id);return;}
            try{Uri selected=data.getData();int grants=data.getFlags()&(Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                if((grants&Intent.FLAG_GRANT_WRITE_URI_PERMISSION)==0)throw new Exception("المجلد لا يسمح بالكتابة");
                getContentResolver().takePersistableUriPermission(selected,grants);
                String previous=prefs.getString("tree",null);prefs.edit().putString("tree",selected.toString()).remove("backupAnchor").commit();
                if(previous!=null&&!previous.equals(selected.toString()))try{getContentResolver().releasePersistableUriPermission(Uri.parse(previous),3);}catch(Exception ignored){}
                result(id,true,true);
            }catch(Exception ex){fail(id,ex);}
        }
    }

    private Uri tree(){
        String saved=prefs.getString("tree",null);if(saved==null)return null;
        Uri uri=Uri.parse(saved);
        for(android.content.UriPermission permission:getContentResolver().getPersistedUriPermissions())if(uri.equals(permission.getUri())&&permission.isReadPermission()&&permission.isWritePermission())return uri;
        return null;
    }
    private Uri requireTree()throws Exception{Uri tree=tree();if(tree==null)throw new Exception("اختر مجلد النسخ الاحتياطي وأعطه إذن الكتابة");return tree;}
    private static Uri rootDocument(Uri tree){return DocumentsContract.buildDocumentUriUsingTree(tree,DocumentsContract.getTreeDocumentId(tree));}
    private String documentName(Uri doc){
        try(Cursor cursor=getContentResolver().query(doc,new String[]{DocumentsContract.Document.COLUMN_DISPLAY_NAME},null,null,null)){if(cursor!=null&&cursor.moveToFirst())return cursor.getString(0);}catch(Exception ignored){}return "مجلد النسخ";
    }
    private static final class Document{final String name;final Uri uri;Document(String name,Uri uri){this.name=name;this.uri=uri;}}
    private List<Document> backups(Uri tree)throws Exception{
        List<Document> list=new ArrayList<>();
        Uri children=DocumentsContract.buildChildDocumentsUriUsingTree(tree,DocumentsContract.getTreeDocumentId(tree));
        try(Cursor cursor=getContentResolver().query(children,new String[]{DocumentsContract.Document.COLUMN_DOCUMENT_ID,DocumentsContract.Document.COLUMN_DISPLAY_NAME},null,null,null)){
            if(cursor==null)throw new Exception("تعذر قراءة مجلد النسخ");
            while(cursor.moveToNext()){String name=cursor.getString(1);if(name.matches("ratib-auto-\\d{4}-\\d{2}-\\d{2}_\\d{2}-\\d{2}-\\d{2}\\.json(?:\\.gz)?")||"ratib-auto-backup.json".equals(name))list.add(new Document(name,DocumentsContract.buildDocumentUriUsingTree(tree,cursor.getString(0))));}
        }
        list.sort((a,b)->a.name.compareTo(b.name));return list;
    }
    private InputStream backupInput(File file) throws Exception {
        java.io.BufferedInputStream in = new java.io.BufferedInputStream(new FileInputStream(file));
        in.mark(2);
        int first = in.read(), second = in.read();
        in.reset();
        if (first == 31 && second == 139) {
            try { return new java.util.zip.GZIPInputStream(in); }
            catch (Exception ex) { in.close(); throw ex; }
        }
        return in;
    }
    private void validateBackupFile(File staged) throws Exception {
        boolean valid = false;
        try (android.util.JsonReader json = new android.util.JsonReader(new java.io.InputStreamReader(backupInput(staged), StandardCharsets.UTF_8))) {
            json.beginObject();
            while (json.hasNext()) {
                if ("app".equals(json.nextName())) valid = "ratib".equals(json.nextString());
                else json.skipValue();
            }
            json.endObject();
            if (!valid || json.peek() != android.util.JsonToken.END_DOCUMENT) throw new java.io.IOException("Invalid Ratib backup");
        }
    }
    private void writeBackup(String name,File staged)throws Exception{
        if(!name.matches("ratib-auto-\\d{4}-\\d{2}-\\d{2}_\\d{2}-\\d{2}-\\d{2}\\.json(?:\\.gz)?"))throw new Exception("Invalid backup filename");
        validateBackupFile(staged);
        Uri selected=requireTree();List<Document> existing=backups(selected);
        java.util.Set<String> used=new java.util.HashSet<>();for(Document doc:existing)used.add(doc.name);
        long timestamp=System.currentTimeMillis();java.text.SimpleDateFormat formatter=new java.text.SimpleDateFormat("yyyy-MM-dd_HH-mm-ss",Locale.ROOT);
        String extension=name.endsWith(".gz")?".json.gz":".json";
        while(used.contains(name)){timestamp+=1000;name="ratib-auto-"+formatter.format(new java.util.Date(timestamp))+extension;}
        // Create before pruning. Keep a complete previous copy on write failure.
        Uri created=DocumentsContract.createDocument(getContentResolver(),rootDocument(selected),name.endsWith(".gz")?"application/gzip":"application/json",name);
        if(created==null)throw new Exception("تعذر إنشاء النسخة الاحتياطية");
        try(OutputStream out=getContentResolver().openOutputStream(created,"wt")){
            if(out==null)throw new Exception("تعذر حفظ النسخة");try (InputStream source = new FileInputStream(staged)) {
                byte[] buffer = new byte[65536];
                int count;
                while ((count = source.read(buffer)) != -1) out.write(buffer, 0, count);
            }
            out.flush();
        }catch(Exception ex){try{DocumentsContract.deleteDocument(getContentResolver(),created);}catch(Exception ignored){}throw ex;}
        // Read back the complete copy before removing any previous backup.
        try(InputStream saved=getContentResolver().openInputStream(created);InputStream source=new FileInputStream(staged)){
            if(saved==null||!java.util.Arrays.equals(backupDigest(saved),backupDigest(source)))throw new java.io.IOException("لم تتطابق النسخة المحفوظة؛ احتُفظ بالنسخ السابقة");
        }catch(Exception ex){try{DocumentsContract.deleteDocument(getContentResolver(),created);}catch(Exception ignored){}throw ex;}
        long now=System.currentTimeMillis(),anchor=prefs.getLong("backupAnchor",0);
        if(anchor>0&&now-anchor<3*60*60*1000L&&!existing.isEmpty()){
            Document newest=existing.get(existing.size()-1);if(!created.equals(newest.uri))try{DocumentsContract.deleteDocument(getContentResolver(),newest.uri);}catch(Exception ignored){}
        }else prefs.edit().putLong("backupAnchor",now).commit();
        List<Document> current=backups(selected);
        for(int i=0;i<current.size()-100;i++){
            if(current.get(i).uri.equals(created))continue;
            if(!DocumentsContract.deleteDocument(getContentResolver(),current.get(i).uri))throw new java.io.IOException("حُفظت النسخة لكن تعذر حذف أقدم نسخة؛ تحقق من إذن المجلد");
        }
    }
    private byte[] backupDigest(InputStream stream)throws Exception{
        java.security.MessageDigest digest=java.security.MessageDigest.getInstance("SHA-256");
        byte[] buffer=new byte[65536];long total=0;int count;
        while((count=stream.read(buffer))!=-1){total+=count;if(total>MAX_FILE)throw new java.io.IOException("النسخة أكبر من الحد المدعوم");digest.update(buffer,0,count);}
        return digest.digest();
    }
    private String readText(Uri uri)throws Exception{
        try(InputStream in=getContentResolver().openInputStream(uri);ByteArrayOutputStream out=new ByteArrayOutputStream()){
            if(in==null)throw new Exception("تعذر قراءة النسخة");byte[] buffer=new byte[65536];int n;
            while((n=in.read(buffer))!=-1){if(out.size()+n>MAX_FILE)throw new Exception("النسخة أكبر من الحد المدعوم");out.write(buffer,0,n);}return out.toString("UTF-8");
        }
    }

    private void printHtml(String id,JSONObject args){
        if(printBusy){result(id,false,"انتظر إغلاق معاينة الطباعة الحالية");return;}
        printBusy=true;
        final WebView print=new WebView(this);configure(print,false);
        root.addView(print,new FrameLayout.LayoutParams(1,1));print.setAlpha(0);
        Runnable dispose=()->{root.removeView(print);print.destroy();printBusy=false;};
        print.setWebViewClient(new WebViewClient(){
            @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest r){return asset(r.getUrl());}
            @Override @SuppressWarnings("deprecation") public WebResourceResponse shouldInterceptRequest(WebView v,String url){return asset(Uri.parse(url));}
            @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){return true;}
            @Override public void onPageFinished(WebView v,String url){
                print.evaluateJavascript("document.fonts.ready.then(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>document.title='ratib-print-ready')))",null);
                waitForPrintReady(0);
            }
            private void waitForPrintReady(int attempts){
                print.evaluateJavascript("document.title==='ratib-print-ready'",ready->{
                    if(!"true".equals(ready)&&attempts<100){print.postDelayed(()->waitForPrintReady(attempts+1),100);return;}
                    if(!"true".equals(ready)){dispose.run();result(id,false,"تعذر تجهيز خطوط الطباعة");return;}
                    try{
                        PrintDocumentAdapter delegate=print.createPrintDocumentAdapter(args.optString("name","راتب"));
                        PrintDocumentAdapter wrapper=new PrintDocumentAdapter(){
                            @Override public void onStart(){delegate.onStart();}
                            @Override public void onLayout(PrintAttributes oldAttrs,PrintAttributes newAttrs,CancellationSignal signal,LayoutResultCallback callback,Bundle extras){delegate.onLayout(oldAttrs,newAttrs,signal,callback,extras);}
                            @Override public void onWrite(PageRange[] pages,ParcelFileDescriptor dest,CancellationSignal signal,WriteResultCallback callback){delegate.onWrite(pages,dest,signal,callback);}
                            @Override public void onFinish(){delegate.onFinish();dispose.run();result(id,true,true);}
                        };
                        PrintAttributes.MediaSize media=args.optBoolean("landscape")?PrintAttributes.MediaSize.ISO_A4.asLandscape():PrintAttributes.MediaSize.ISO_A4.asPortrait();
                        ((PrintManager)getSystemService(PRINT_SERVICE)).print(args.optString("name","راتب"),wrapper,new PrintAttributes.Builder().setMediaSize(media).setMinMargins(new PrintAttributes.Margins(275,275,275,275)).build());
                    }catch(Exception ex){dispose.run();fail(id,ex);}
                });
            }
        });
        print.loadDataWithBaseURL(ORIGIN,args.optString("html"),"text/html","UTF-8",null);
    }

    private final BiometricVault biometricVault=new BiometricVault();
    private static final int VOICE_PERMISSION=7119;
    private String voiceRequest,voiceLanguage;
    private android.speech.SpeechRecognizer voiceRecognizer;
    private void startVoice(String id,JSONObject args){
        if(voiceRequest!=null){result(id,false,"الإملاء قيد التشغيل؛ أوقفه أولًا");return;}
        voiceRequest=id;voiceLanguage=args.optString("lang","ar-SA");
        if(!voiceLanguage.equals("ar-SA")&&!voiceLanguage.equals("ar-YE")&&!voiceLanguage.equals("ar-EG"))voiceLanguage="ar-SA";
        if(checkSelfPermission(android.Manifest.permission.RECORD_AUDIO)!=android.content.pm.PackageManager.PERMISSION_GRANTED){
            requestPermissions(new String[]{android.Manifest.permission.RECORD_AUDIO},VOICE_PERMISSION);return;
        }
        beginVoice();
    }
    private void beginVoice(){
        final String id=voiceRequest;if(id==null)return;
        if(!android.speech.SpeechRecognizer.isRecognitionAvailable(this)){finishVoice(id,false,"لا توجد خدمة تعرف على الكلام؛ فعّل خدمات الكلام في أندرويد");return;}
        try{
            voiceRecognizer=android.speech.SpeechRecognizer.createSpeechRecognizer(this);
            voiceRecognizer.setRecognitionListener(new android.speech.RecognitionListener(){
                public void onReadyForSpeech(Bundle b){}
                public void onBeginningOfSpeech(){}
                public void onRmsChanged(float rms){}
                public void onBufferReceived(byte[] buffer){}
                public void onEndOfSpeech(){}
                public void onPartialResults(Bundle b){}
                public void onEvent(int event,Bundle b){}
                public void onResults(Bundle b){
                    ArrayList<String> matches=b==null?null:b.getStringArrayList(android.speech.SpeechRecognizer.RESULTS_RECOGNITION);
                    if(matches==null||matches.isEmpty()||matches.get(0)==null||matches.get(0).trim().isEmpty())finishVoice(id,false,"لم أسمع كلامًا واضحًا؛ أعد المحاولة");
                    else finishVoice(id,true,matches.get(0));
                }
                public void onError(int error){
                    String message;
                    switch(error){
                        case 9:message="اسمح بالميكروفون لتطبيق راتب من إعدادات أندرويد ثم أعد المحاولة";break;
                        case 1:case 2:message="تعذر اتصال خدمة الإملاء؛ تحقق من الإنترنت وأعد المحاولة";break;
                        case 6:case 7:message="لم أسمع كلامًا واضحًا؛ اضغط الميكروفون وأعد المحاولة";break;
                        case 8:message="خدمة الإملاء مشغولة؛ أعد المحاولة بعد لحظات";break;
                        case 3:message="تعذر استخدام الميكروفون؛ تأكد أنه غير مستخدم في تطبيق آخر";break;
                        case 12:case 13:message="اللغة المختارة غير متاحة في خدمة الإملاء؛ فعّل العربية في إعدادات خدمات الكلام";break;
                        default:message="تعذر الإملاء الصوتي؛ أعد المحاولة ("+error+")";
                    }
                    finishVoice(id,false,message);
                }
            });
            Intent intent=new Intent(android.speech.RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE_MODEL,android.speech.RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE,voiceLanguage);
            intent.putExtra(android.speech.RecognizerIntent.EXTRA_MAX_RESULTS,1);
            intent.putExtra(android.speech.RecognizerIntent.EXTRA_PARTIAL_RESULTS,false);
            voiceRecognizer.startListening(intent);
        }catch(Exception ex){finishVoice(id,false,"تعذر بدء الإملاء؛ تحقق من إذن الميكروفون وخدمة الكلام في أندرويد");}
    }
    private void releaseVoice(){
        android.speech.SpeechRecognizer old=voiceRecognizer;voiceRecognizer=null;
        if(old!=null){old.cancel();old.destroy();}
    }
    private void finishVoice(String id,boolean ok,String value){
        if(!id.equals(voiceRequest))return;
        voiceRequest=null;releaseVoice();result(id,ok,value);
    }
    private void cancelVoice(){
        String id=voiceRequest;voiceRequest=null;releaseVoice();if(id!=null)abort(id);
    }
    private boolean hasBiometrics(){
        if(Build.VERSION.SDK_INT>=30)return ((android.hardware.biometrics.BiometricManager)getSystemService(BIOMETRIC_SERVICE)).canAuthenticate(android.hardware.biometrics.BiometricManager.Authenticators.BIOMETRIC_STRONG)==android.hardware.biometrics.BiometricManager.BIOMETRIC_SUCCESS;
        if(Build.VERSION.SDK_INT>=29)return ((android.hardware.biometrics.BiometricManager)getSystemService(BIOMETRIC_SERVICE)).canAuthenticate()==android.hardware.biometrics.BiometricManager.BIOMETRIC_SUCCESS;
        try{Object manager=getSystemService("fingerprint");return manager!=null&&(Boolean)manager.getClass().getMethod("isHardwareDetected").invoke(manager)&&(Boolean)manager.getClass().getMethod("hasEnrolledFingerprints").invoke(manager);}catch(Exception ex){return false;}
    }
    private void biometric(String id,JSONObject args){
        if(!hasBiometrics()){result(id,false,"لا توجد بصمة مسجلة على هذا الجهاز");return;}
        if(biometricSignal!=null){result(id,false,"انتظر التحقق الحالي");return;}
        boolean register=args.optBoolean("register");String saved=prefs.getString("biometric",null);
        if(!register&&(saved==null||!saved.equals(args.optString("credential")))){result(id,false,"فعّل البصمة من الإعدادات بعد فتح التطبيق بالرقم السري");return;}
        biometricSignal=new CancellationSignal();
        new BiometricPrompt.Builder(this).setTitle("فتح راتب").setSubtitle("تحقق ببصمة أندرويد")
            .setNegativeButton("إلغاء",getMainExecutor(),(dialog,which)->{if(biometricSignal!=null)biometricSignal.cancel();})
            .build().authenticate(biometricSignal,getMainExecutor(),new BiometricPrompt.AuthenticationCallback(){
                @Override public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult auth){biometricSignal=null;String value=saved;if(register){value=UUID.randomUUID().toString();prefs.edit().putString("biometric",value).apply();}result(id,true,value);}
                @Override public void onAuthenticationError(int code,CharSequence message){biometricSignal=null;result(id,false,message.toString());}
            });
    }
    private boolean notificationsAllowed(){return Build.VERSION.SDK_INT<33||checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)==PackageManager.PERMISSION_GRANTED;}
    private void createNotificationChannel(){((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(new NotificationChannel("ratib-reminders","تذكيرات راتب",NotificationManager.IMPORTANCE_DEFAULT));}
    private void notificationPermission(String id){
        if(notificationsAllowed()){result(id,true,"granted");return;}
        if(notificationRequest!=null){result(id,false,"طلب الإشعارات قيد التنفيذ");return;}
        notificationRequest=id;requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},NOTIFY_PERMISSION);
    }
    @Override public void onRequestPermissionsResult(int request,String[] permissions,int[] grants){super.onRequestPermissionsResult(request,permissions,grants);
        if(request==VOICE_PERMISSION){
            if(voiceRequest!=null){
                if(grants.length>0&&grants[0]==android.content.pm.PackageManager.PERMISSION_GRANTED)beginVoice();
                else finishVoice(voiceRequest,false,"اسمح بالميكروفون لتطبيق راتب من إعدادات أندرويد لاستخدام الإملاء");
            }
            return;
        }
if(request==NOTIFY_PERMISSION&&notificationRequest!=null){String id=notificationRequest;notificationRequest=null;result(id,true,notificationsAllowed()?"granted":"denied");}}
    private void notifyUser(JSONObject args){
        if(!notificationsAllowed())return;
        PendingIntent intent=PendingIntent.getActivity(this,0,new Intent(this,MainActivity.class),PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);
        Notification notification=new Notification.Builder(this,"ratib-reminders").setSmallIcon(android.R.drawable.ic_popup_reminder).setContentTitle(args.optString("title")).setContentText(args.optString("body")).setContentIntent(intent).setAutoCancel(true).build();
        ((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).notify(args.optString("tag").hashCode(),notification);
    }
    private void cleanOldExports(){File dir=new File(getCacheDir(),"exports");File[] files=dir.listFiles();if(files!=null)for(File file:files)if(System.currentTimeMillis()-file.lastModified()>24*60*60*1000L)file.delete();}
    @Override public void onBackPressed(){web.evaluateJavascript("(()=>{if(typeof window.ratibNativeBack==='function'){window.ratibNativeBack();return true;}if(typeof goBackInApp==='function'){goBackInApp();return true;}return false;})()",value->{if(!"true".equals(value))new AlertDialog.Builder(this).setMessage("إغلاق راتب؟").setPositiveButton("إغلاق",(d,w)->finish()).setNegativeButton("إلغاء",null).show();});}
    @Override protected void onPause(){if(voiceRecognizer!=null)cancelVoice();if(web!=null)web.evaluateJavascript("typeof flushStorage==='function'&&flushStorage().catch(console.warn)",null);super.onPause();}
    @Override protected void onDestroy(){
        cancelVoice();biometricVault.cancel();if(biometricSignal!=null)biometricSignal.cancel();
        for(Transfer t:transfers.values()){try{t.out.close();}catch(Exception ignored){}t.file.delete();}
        if(fileCallback!=null)fileCallback.onReceiveValue(null);
        io.execute(()->{for(File temp:incomingBackups.values())temp.delete();incomingBackups.clear();});io.shutdown();if(web!=null){root.removeView(web);web.removeJavascriptInterface("RatibNative");web.destroy();web=null;}super.onDestroy();
    }
}
