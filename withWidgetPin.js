const { withDangerousMod, withMainApplication } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const WIDGET_PIN_MODULE_JAVA = `package com.digibouquet.app;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.os.Build;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class WidgetPinModule extends ReactContextBaseJavaModule {
    public WidgetPinModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @NonNull
    @Override
    public String getName() {
        return "WidgetPin";
    }

    @ReactMethod
    public void isRequestPinAppWidgetSupported(Promise promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(getReactApplicationContext());
            promise.resolve(appWidgetManager.isRequestPinAppWidgetSupported());
        } else {
            promise.resolve(false);
        }
    }

    @ReactMethod
    public void requestPinAppWidget(String providerClassName, Promise promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(getReactApplicationContext());
            if (appWidgetManager.isRequestPinAppWidgetSupported()) {
                ComponentName myProvider = new ComponentName(getReactApplicationContext().getPackageName(), providerClassName);
                boolean success = appWidgetManager.requestPinAppWidget(myProvider, null, null);
                promise.resolve(success);
            } else {
                promise.resolve(false);
            }
        } else {
            promise.resolve(false);
        }
    }
}
`;

const WIDGET_PIN_PACKAGE_JAVA = `package com.digibouquet.app;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class WidgetPinPackage implements ReactPackage {
    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }

    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new WidgetPinModule(reactContext));
        return modules;
    }
}
`;

module.exports = function withWidgetPin(config) {
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const packageRoot = path.join(config.modRequest.platformProjectRoot, 'app', 'src', 'main', 'java', 'com', 'digibouquet', 'app');
      fs.writeFileSync(path.join(packageRoot, 'WidgetPinModule.java'), WIDGET_PIN_MODULE_JAVA);
      fs.writeFileSync(path.join(packageRoot, 'WidgetPinPackage.java'), WIDGET_PIN_PACKAGE_JAVA);
      return config;
    },
  ]);

  config = withMainApplication(config, (config) => {
    let mainApplication = config.modResults.contents;
    
    // Add WidgetPinPackage to getPackages() in MainApplication.kt
    // Matches both the commented and non-commented variants of the apply block
    if (!mainApplication.includes('WidgetPinPackage()')) {
      // Try to match the apply block and inject add(WidgetPinPackage()) inside it
      mainApplication = mainApplication.replace(
        /(PackageList\(this\)\.packages\.apply\s*\{)/,
        `$1\n              add(WidgetPinPackage())`
      );
    }
    config.modResults.contents = mainApplication;
    return config;
  });

  return config;
};
