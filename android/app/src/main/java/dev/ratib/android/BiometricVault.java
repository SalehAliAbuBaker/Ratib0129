package dev.ratib.android;

import android.app.Activity;
import android.hardware.biometrics.BiometricPrompt;
import android.os.Build;
import android.os.CancellationSignal;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import java.security.KeyStore;
import java.util.Arrays;
import java.util.UUID;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import org.json.JSONObject;

/** No PIN or plaintext vault key is persisted. Each cipher use requires strong biometrics. */
final class BiometricVault {
    interface Reply { void done(boolean ok,Object value); }
    private CancellationSignal pending;
    private static final String PREFIX="ratib.biometric.v1.";
    private static byte[] decode(String value){return Base64.decode(value,Base64.NO_WRAP);}
    private static String encode(byte[] value){return Base64.encodeToString(value,Base64.NO_WRAP);}
    static void delete(String id) throws Exception {
        UUID.fromString(id);KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);store.deleteEntry(PREFIX+id);
    }
    void cancel(){if(pending!=null)pending.cancel();}
    void prompt(Activity activity,JSONObject args,boolean wrap,Reply reply){
        if(pending!=null){reply.done(false,"انتظر انتهاء طلب البصمة الحالي");return;}
        final String id=wrap?UUID.randomUUID().toString():args.optString("id");
        byte[] input=null;
        try{
            UUID.fromString(id);
            input=decode(args.optString(wrap?"key":"data"));
            if(input.length!=(wrap?32:48))throw new IllegalArgumentException();
            KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);
            if(wrap){
                KeyGenerator generator=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");
                KeyGenParameterSpec.Builder spec=new KeyGenParameterSpec.Builder(PREFIX+id,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT)
                    .setKeySize(256).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                    .setUserAuthenticationRequired(true).setInvalidatedByBiometricEnrollment(true);
                if(Build.VERSION.SDK_INT>=30)spec.setUserAuthenticationParameters(0,KeyProperties.AUTH_BIOMETRIC_STRONG);
                else spec.setUserAuthenticationValidityDurationSeconds(-1);
                generator.init(spec.build());generator.generateKey();
            }
            SecretKey key=(SecretKey)store.getKey(PREFIX+id,null);
            if(key==null)throw new IllegalStateException();
            Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");
            if(wrap)cipher.init(Cipher.ENCRYPT_MODE,key);
            else cipher.init(Cipher.DECRYPT_MODE,key,new GCMParameterSpec(128,decode(args.optString("iv"))));
            final byte[] associatedData=decode(args.optString("aad"));
            final byte[] payload=input;
            pending=new CancellationSignal();
            BiometricPrompt.Builder builder=new BiometricPrompt.Builder(activity).setTitle("فتح راتب بالبصمة")
                .setSubtitle(wrap?"تفعيل فتح البيانات المشفرة بالبصمة":"فتح البيانات المشفرة")
                .setNegativeButton("إلغاء",activity.getMainExecutor(),(dialog,which)->cancel());
            if(Build.VERSION.SDK_INT>=30)builder.setAllowedAuthenticators(android.hardware.biometrics.BiometricManager.Authenticators.BIOMETRIC_STRONG);
            builder.build().authenticate(new BiometricPrompt.CryptoObject(cipher),pending,activity.getMainExecutor(),new BiometricPrompt.AuthenticationCallback(){
                @Override public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult auth){
                    pending=null;
                    try{
                        Cipher authenticated=auth.getCryptoObject().getCipher();
                        authenticated.updateAAD(associatedData);byte[] output=authenticated.doFinal(payload);
                        try{reply.done(true,wrap?new JSONObject().put("id",id).put("iv",encode(authenticated.getIV())).put("data",encode(output)):encode(output));}
                        finally{Arrays.fill(output,(byte)0);}
                    }catch(Exception e){if(wrap)try{delete(id);}catch(Exception ignored){}reply.done(false,"تعذر فتح مفتاح الحماية؛ استخدم الرقم السري وأعد تفعيل البصمة");}
                    finally{Arrays.fill(payload,(byte)0);}
                }
                @Override public void onAuthenticationError(int code,CharSequence message){pending=null;Arrays.fill(payload,(byte)0);if(wrap)try{delete(id);}catch(Exception ignored){}reply.done(false,"لم يكتمل التحقق بالبصمة؛ يمكنك استخدام الرقم السري");}
            });
        }catch(Exception e){pending=null;if(input!=null)Arrays.fill(input,(byte)0);if(wrap)try{delete(id);}catch(Exception ignored){}reply.done(false,"البصمة غير متاحة أو تغيرت بصمات الجهاز. افتح بالرقم السري ثم أعد تفعيلها");}
    }
}
