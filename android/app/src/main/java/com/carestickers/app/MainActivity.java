package com.carestickers.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  private void allowHttpApiFromHttpsWebView() {
    if (bridge == null || bridge.getWebView() == null) return;
    bridge
      .getWebView()
      .getSettings()
      .setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
  }

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    allowHttpApiFromHttpsWebView();
  }

  @Override
  public void onStart() {
    super.onStart();
    allowHttpApiFromHttpsWebView();
  }
}
