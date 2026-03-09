package com.zoneminder.zmNinjaNG;

import android.net.http.SslError;
import android.webkit.SslErrorHandler;
import android.webkit.WebView;

import com.getcapacitor.BridgeWebViewClient;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.security.SecureRandom;
import java.security.cert.X509Certificate;

import javax.net.ssl.HostnameVerifier;
import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSession;
import javax.net.ssl.SSLSocketFactory;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

@CapacitorPlugin(name = "SSLTrust")
public class SSLTrustPlugin extends Plugin {

    private boolean enabled = false;
    private SSLSocketFactory originalSslSocketFactory;
    private HostnameVerifier originalHostnameVerifier;

    @Override
    public void load() {
        // Save originals so we can restore them on disable
        originalSslSocketFactory = HttpsURLConnection.getDefaultSSLSocketFactory();
        originalHostnameVerifier = HttpsURLConnection.getDefaultHostnameVerifier();
    }

    @PluginMethod
    public void enable(PluginCall call) {
        this.enabled = true;
        installTrustAllCerts();
        installWebViewSslHandler();
        call.resolve();
    }

    @PluginMethod
    public void disable(PluginCall call) {
        this.enabled = false;
        restoreOriginalCerts();
        restoreWebViewSslHandler();
        call.resolve();
    }

    @PluginMethod
    public void isEnabled(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("enabled", this.enabled);
        call.resolve(ret);
    }

    /**
     * Install a TrustManager that accepts all certificates.
     * This covers CapacitorHttp requests which use HttpsURLConnection/OkHttp.
     */
    private void installTrustAllCerts() {
        try {
            TrustManager[] trustAllCerts = new TrustManager[]{
                new X509TrustManager() {
                    @Override
                    public void checkClientTrusted(X509Certificate[] chain, String authType) {
                        // Accept all client certificates
                    }

                    @Override
                    public void checkServerTrusted(X509Certificate[] chain, String authType) {
                        // Accept all server certificates
                    }

                    @Override
                    public X509Certificate[] getAcceptedIssuers() {
                        return new X509Certificate[0];
                    }
                }
            };

            SSLContext sslContext = SSLContext.getInstance("TLS");
            sslContext.init(null, trustAllCerts, new SecureRandom());
            HttpsURLConnection.setDefaultSSLSocketFactory(sslContext.getSocketFactory());
            HttpsURLConnection.setDefaultHostnameVerifier(new HostnameVerifier() {
                @Override
                public boolean verify(String hostname, SSLSession session) {
                    return true;
                }
            });
        } catch (Exception e) {
            // Log but don't crash
        }
    }

    /**
     * Restore the original SSL socket factory and hostname verifier.
     */
    private void restoreOriginalCerts() {
        if (originalSslSocketFactory != null) {
            HttpsURLConnection.setDefaultSSLSocketFactory(originalSslSocketFactory);
        }
        if (originalHostnameVerifier != null) {
            HttpsURLConnection.setDefaultHostnameVerifier(originalHostnameVerifier);
        }
    }

    /**
     * Replace the WebView client with one that accepts SSL errors.
     * This covers <img src="https://...">, MJPEG streams, and WSS connections.
     */
    private void installWebViewSslHandler() {
        getActivity().runOnUiThread(() -> {
            try {
                WebView webView = getBridge().getWebView();
                webView.setWebViewClient(new BridgeWebViewClient(getBridge()) {
                    @Override
                    public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                        if (enabled) {
                            handler.proceed();
                        } else {
                            handler.cancel();
                        }
                    }
                });
            } catch (Exception e) {
                // Ignore
            }
        });
    }

    /**
     * Restore the default WebView client (strict SSL).
     */
    private void restoreWebViewSslHandler() {
        getActivity().runOnUiThread(() -> {
            try {
                WebView webView = getBridge().getWebView();
                webView.setWebViewClient(new BridgeWebViewClient(getBridge()));
            } catch (Exception e) {
                // Ignore
            }
        });
    }
}
