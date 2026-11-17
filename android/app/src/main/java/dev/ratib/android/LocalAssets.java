package dev.ratib.android;

import android.content.Context;
import android.net.Uri;
import android.webkit.WebResourceResponse;
import androidx.webkit.WebViewAssetLoader;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collections;

/** Packaged HTTPS content. Keep the v1 origin to preserve its IndexedDB vault. */
final class LocalAssets {
    static final String HOST="app.ratib.local";
    static final String ORIGIN="https://"+HOST+"/";
    static final String ENTRY=ORIGIN+"index.html";
    static final String CSP="default-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://ratib.saleh0129.workers.dev https://www.googleapis.com; frame-src 'none'; object-src 'none'";
    private final Context context;
    private final WebViewAssetLoader loader;

    LocalAssets(Context context){
        this.context=context;
        WebViewAssetLoader.AssetsPathHandler packaged=new WebViewAssetLoader.AssetsPathHandler(context);
        loader=new WebViewAssetLoader.Builder().setDomain(HOST).setHttpAllowed(false)
            .addPathHandler("/",path->packaged.handle("www/"+(path.isEmpty()?"index.html":path))).build();
    }

    static boolean owns(Uri uri){return "https".equals(uri.getScheme())&&HOST.equals(uri.getHost());}
    WebResourceResponse intercept(Uri uri){
        if(!owns(uri))return null;
        String path=uri.getPath();
        if(path==null)path="/index.html";
        for(String segment:path.split("/"))if("..".equals(segment)||segment.indexOf('\\')>=0)return missing();
        WebResourceResponse response=loader.shouldInterceptRequest(uri);
        // Never let a missing packaged URL fall back to DNS / internet.
        if(response==null||response.getData()==null)return missing();
        response.setStatusCodeAndReasonPhrase(200,"OK");
        response.setMimeType(MainActivity.mimeFor(path,response.getMimeType()));
        if(path.endsWith(".html")||path.endsWith(".js")||path.endsWith(".css")||path.endsWith(".json"))response.setEncoding("UTF-8");
        else response.setEncoding(null);
        java.util.Map<String,String> headers=new java.util.HashMap<>();headers.put("Cache-Control","no-store");
        if(path.endsWith(".html")||"/".equals(path))headers.put("Content-Security-Policy",CSP);
        response.setResponseHeaders(headers);return response;
    }
    String readEntry()throws IOException{
        try(InputStream in=context.getAssets().open("www/index.html");ByteArrayOutputStream out=new ByteArrayOutputStream()){
            byte[] buffer=new byte[16384];int count;
            while((count=in.read(buffer))!=-1)out.write(buffer,0,count);
            String html=new String(out.toByteArray(),StandardCharsets.UTF_8);
            if(!html.contains("<html")||!html.contains("ratib-native-bridge.js"))throw new IOException("Invalid bundled index.html");
            return html;
        }
    }
    private static WebResourceResponse missing(){return new WebResourceResponse("text/plain","UTF-8",404,"Not Found",Collections.singletonMap("Cache-Control","no-store"),new ByteArrayInputStream("Bundled asset not found".getBytes(StandardCharsets.UTF_8)));}
}
