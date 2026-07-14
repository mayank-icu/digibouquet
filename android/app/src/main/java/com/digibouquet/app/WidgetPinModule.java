package com.digibouquet.app;

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
