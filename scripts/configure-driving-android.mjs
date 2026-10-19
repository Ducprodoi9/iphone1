import {readFile,writeFile,mkdir,cp,rm} from 'node:fs/promises';
const root='mobile-app-source/android';
const buildPath=`${root}/app/build.gradle`;
let build=await readFile(buildPath,'utf8');
build=build.replace(/versionName\s*=\s*"[^"]*"/, 'versionName = "1.0.0"').replace(/versionName\s+"[^"]*"/, 'versionName "1.0.0"');
build=build.replace(/buildTypes\s*\{/,`buildTypes {\n        debug { applicationIdSuffix '.preview'; versionNameSuffix '-preview' }`);
build=build.replace(/dependencies\s*\{/,`dependencies {\n    androidTestImplementation 'androidx.test:runner:1.6.2'`);
build=build.replace(/defaultConfig\s*\{/,`defaultConfig {\n        testInstrumentationRunner 'androidx.test.runner.AndroidJUnitRunner'`);
await writeFile(buildPath,build);
const manifestPath=`${root}/app/src/main/AndroidManifest.xml`;
let manifest=await readFile(manifestPath,'utf8');
manifest=manifest.replace(/android:allowBackup="true"/,'android:allowBackup="false"').replace('<application','<application android:usesCleartextTraffic="false"');
await writeFile(manifestPath,manifest);
const java=`${root}/app/src/main/java/com/ronnguyen/fuehrerscheinvietduc/MainActivity.java`;
await writeFile(java,`package com.ronnguyen.fuehrerscheinvietduc;
import android.content.pm.ActivityInfo;
import android.os.Bundle;
import android.os.Build;
import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;
public class MainActivity extends BridgeActivity {
  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    if(Build.VERSION.SDK_INT>=35) EdgeToEdge.enable(this);
    if(getResources().getConfiguration().smallestScreenWidthDp<600) setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
  }
}
`);
const testDir=`${root}/app/src/androidTest/java/com/ronnguyen/fuehrerscheinvietduc`;
await rm(`${root}/app/src/androidTest/java/com/getcapacitor`,{recursive:true,force:true});
await mkdir(testDir,{recursive:true});
await cp('tests/android/DrivingSmokeTest.java',`${testDir}/DrivingSmokeTest.java`);
console.log('Configured preview package, current SDK defaults, native HTTP and Android safe area.');
