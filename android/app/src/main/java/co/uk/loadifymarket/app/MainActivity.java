package co.uk.loadifymarket.app;

import android.os.Bundle;
import android.view.View;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Keep the installed marketplace app visually anchored at scroll bounds.
        // Normal vertical scrolling remains enabled, but Android WebView must not
        // stretch/bounce the entire page when the user drags beyond the top/bottom.
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().setOverScrollMode(View.OVER_SCROLL_NEVER);
        }
    }
}
