package com.ronnguyen.fuehrerscheinvietduc;

import android.content.Intent;
import android.os.ParcelFileDescriptor;
import android.webkit.WebView;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.FileInputStream;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class DrivingSmokeTest {
  private String evaluate(WebView web,String script) throws Exception {
    CountDownLatch latch=new CountDownLatch(1);String[] result=new String[1];
    InstrumentationRegistry.getInstrumentation().runOnMainSync(()->web.evaluateJavascript(script,value->{result[0]=value;latch.countDown();}));
    assertTrue(latch.await(10,TimeUnit.SECONDS));return result[0];
  }
  @Test public void actualAndroidAppLoadsLatestUiFeaturesAndProductionApi() throws Exception {
    var instrument=InstrumentationRegistry.getInstrumentation();
    var intent=new Intent(instrument.getTargetContext(),MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    MainActivity activity=(MainActivity)instrument.startActivitySync(intent);
    try {
      WebView web=activity.getBridge().getWebView();long deadline=System.currentTimeMillis()+45000;String text="";
      while(System.currentTimeMillis()<deadline) {
        text=evaluate(web,"document.body.innerText");
        if(text.contains("Đăng nhập")||text.contains("Einloggen"))break;
        Thread.sleep(250);
      }
      assertTrue("Login renders: "+text,text.contains("Đăng nhập")||text.contains("Einloggen"));
      assertEquals("\"android\"",evaluate(web,"Capacitor.getPlatform()"));
      assertEquals("true",evaluate(web,"localStorage.getItem('device_id').startsWith('android-')"));
      assertEquals("\"function\"",evaluate(web,"typeof FuehrerscheinFeatures.api"));
      assertEquals("Per-question AI explanations module loaded", "true", evaluate(web,"window.__fvAiExplanationsMounted===true"));
      evaluate(web,"window.__probe='waiting'; fetch('https://nguyenron.com/fuehrerschein-backend/api/me.php',{credentials:'omit'}).then(async r=>{const d=await r.json();window.__probe=(r.status===401||r.status===403||r.status===200)&&d&&typeof d==='object'?'ok':'invalid';}).catch(()=>window.__probe='error')");
      deadline=System.currentTimeMillis()+45000;String result="";
      while(System.currentTimeMillis()<deadline) {result=evaluate(web,"window.__probe");if(!result.equals("\"waiting\""))break;Thread.sleep(250);}
      assertEquals("Production API through native HTTP","\"ok\"",result);
      String identity=evaluate(web,"localStorage.getItem('device_id')");
      instrument.runOnMainSync(web::reload);
      deadline=System.currentTimeMillis()+15000;String current="null";
      while(System.currentTimeMillis()<deadline) {current=evaluate(web,"localStorage.getItem('device_id')");if(identity.equals(current))break;Thread.sleep(250);}
      assertEquals("Android identity persists across reopening the web app",identity,current);
      Thread.sleep(1000);
      // Save outside app-owned storage: Gradle uninstalls instrumentation apps on completion.
      try (ParcelFileDescriptor descriptor=instrument.getUiAutomation().executeShellCommand(
          "screencap -p /sdcard/Download/Fuehrerschein-Android-Login.png");
          FileInputStream output=new FileInputStream(descriptor.getFileDescriptor())) {
        while(output.read()!=-1) { /* Wait for shell capture to finish before closing the app. */ }
      }
    } finally {instrument.runOnMainSync(activity::finish);}
  }
}
