package dev.ratib.android;

import org.json.JSONObject;
import javax.net.ssl.HttpsURLConnection;
import java.net.URL;
import java.io.*;
import java.nio.charset.StandardCharsets;

/** Streams binary Drive files without converting their bytes to JSON strings. */
final class NativeHttp {
    private static final long MAX_FILE = 128L * 1024 * 1024;
    static JSONObject call(String url,String method,String body,String contentType,String token)throws Exception {
        byte[] bytes=body.getBytes(StandardCharsets.UTF_8);
        return request(url,method,new ByteArrayInputStream(bytes),bytes.length,contentType,token,null);
    }
    static JSONObject callFile(String url,String method,File body,String contentType,String token)throws Exception {
        try(InputStream in=new FileInputStream(body)){
            return request(url,method,in,body.length(),contentType,token,null);
        }
    }
    static JSONObject download(String url,String token,File target)throws Exception {
        return request(url,"GET",null,0,"application/octet-stream",token,target);
    }
    private static JSONObject request(String url,String method,InputStream body,long length,
                                      String contentType,String token,File targetFile)throws Exception {
        URL target=new URL(url);
        if(!"https".equals(target.getProtocol())||target.getPort()!=-1||target.getUserInfo()!=null)
            throw new Exception("عنوان اتصال غير مسموح");
        String host=target.getHost(),path=target.getPath();
        boolean license="ratib.saleh0129.workers.dev".equals(host)&&
            ("/api/license/activate".equals(path)||"/api/license/verify".equals(path));
        boolean drive="www.googleapis.com".equals(host)&&
            (path.startsWith("/drive/v3/files")||path.equals("/drive/v3/about")||path.equals("/upload/drive/v3/files"));
        if(!(license&&"POST".equals(method))&&!(drive&&("GET".equals(method)||"POST".equals(method)||"DELETE".equals(method))))
            throw new Exception("عنوان أو طريقة اتصال غير مسموحة");
        if(drive&&(token==null||token.isEmpty()))throw new Exception("اربط حساب Google أولاً");
        if(length>MAX_FILE||(license&&length>8000))throw new Exception("حجم الطلب أكبر من الحد المدعوم");
        HttpsURLConnection c=(HttpsURLConnection)target.openConnection();
        c.setConnectTimeout(20000);c.setReadTimeout(45000);c.setInstanceFollowRedirects(false);c.setRequestMethod(method);
        c.setRequestProperty("Accept",targetFile==null?"application/json":"*/*");
        if(drive)c.setRequestProperty("Authorization","Bearer "+token);
        try {
            if(length>0){
                c.setDoOutput(true);c.setRequestProperty("Content-Type",contentType);c.setFixedLengthStreamingMode(length);
                try(OutputStream out=c.getOutputStream()){copy(body,out,MAX_FILE);}
            }
            int status=c.getResponseCode();
            InputStream stream=status>=400?c.getErrorStream():c.getInputStream();
            JSONObject result=new JSONObject().put("status",status);
            if(targetFile!=null&&status>=200&&status<300){
                if(stream==null)throw new IOException("تعذر قراءة الملف من Google Drive");
                try(InputStream in=stream;OutputStream out=new FileOutputStream(targetFile)){copy(in,out,MAX_FILE);}
                return result.put("mime",c.getContentType()==null?"application/octet-stream":c.getContentType());
            }
            try(ByteArrayOutputStream out=new ByteArrayOutputStream()){
                if(stream!=null)try(InputStream in=stream){copy(in,out,20L*1024*1024);}
                return result.put("body",out.toString("UTF-8"));
            }
        } finally {c.disconnect();}
    }
    private static void copy(InputStream in,OutputStream out,long maximum)throws Exception {
        byte[] buffer=new byte[65536];long copied=0;int count;
        while((count=in.read(buffer))!=-1){
            copied+=count;
            if(copied>maximum)throw new IOException("الملف أكبر من الحد المدعوم");
            out.write(buffer,0,count);
        }
    }
}
